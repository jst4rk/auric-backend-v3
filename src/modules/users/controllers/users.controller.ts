import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';

import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { FilterUsersDto } from '../dto/filter-users.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { IResponse } from '../../common/interfaces/response.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly _userService: UsersService) { }

  @Post()
  async createUser(@Body() userData: CreateUserDto): Promise<User> {
    return await this._userService.create(userData);
  }

  @Get('/')
  async getAllUsers(@Query() query: FilterUsersDto): Promise<IResponse<User[]>> {
    return await this._userService.findAll(query);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<User> {
    return await this._userService.findById(id);
  }
}
