import { HttpException, Injectable } from '@nestjs/common';

import * as R from 'ramda';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UsersRepository } from '../repositories/users.repository';
import { User } from '../entities/user.entity';
import { FilterUsersDto } from '../dto/filter-users.dto';
import { IResponse } from '../../common/interfaces/response.interface';

@Injectable()
export class UsersService {
  constructor(private _usersRepository: UsersRepository) { }

  async create(createUserData: CreateUserDto): Promise<User> {
    try {
      // In case that we receive a verified field we need to delete it
      // because in creation always must be false
      const createdUser = await this._usersRepository.create(createUserData);

      return createdUser;
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }

  async findAll(query: FilterUsersDto): Promise<IResponse<User[]>> {
    try {
      const usersResponse = await this._usersRepository.findAll(query);

      return usersResponse;
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }

  async findById(id: string): Promise<User> {
    try {
      const user = await this._usersRepository.findById(id, {});

      return user;
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }

  async findUserBalances(userId: string) {
    try {
      const userBalances = this._usersRepository.findUserBalances(userId);
  
      return userBalances;
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }

  async updateById(userId: string, updateData: UpdateUserDto) {
    try {
      return await this._usersRepository.updateById(userId, updateData);
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }

  // async findByUsername(username: string): Promise<User> {
  //   try {
  //     return await this._usersRepository.findByUsername(username);
  //   } catch (error) {
  //     throw new HttpException(error.message, error.status || 500);
  //   }
  // }

  // async updateRefreshToken(userId: string, refreshToken: string) {
  //   try {
  //     const hashedToken = await bcrypt.hash(refreshToken, 10);

  //     return await this._usersRepository.updateById(userId, { refreshToken: hashedToken });
  //   } catch (error) {
  //     throw new HttpException(error.message, error.status || 500);
  //   }
  // }
}
