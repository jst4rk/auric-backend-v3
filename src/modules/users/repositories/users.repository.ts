import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import * as R from 'ramda';
import { ClientSession, Model, Types } from 'mongoose';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { FilterUsersDto } from '../dto/filter-users.dto';
import { cleanObject, getQueryMetadata, includeIfPresent } from '../../common/functions/helpers-fns';
import { convertDateRange, extractQueryParams, findLike } from '../../common/functions/query';
import { IResponse } from '../../common/interfaces/response.interface';
import { ECurrency } from '../../common/enums';

const buildQuery: (query: FilterUsersDto) => Record<string, any> = R.applySpec({
  _id: includeIfPresent('_id'),
  firstName: findLike('firstName'),
  lastName: findLike('lastName'),
  email: findLike('email'),
  createdAt: convertDateRange('startDate', 'endDate'),
  deletedAt: R.always(null),
});

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private userModel: Model<User>) { }

  async create(createUserData: CreateUserDto): Promise<User> {
    try {
      const createdUser = await this.userModel.create(createUserData);

      return createdUser.toJSON();
    } catch (error) {
      // Mongo duplicate key
      if (error?.code === 11000) {
        const field = Object.keys(error.keyValue ?? {})[0] ?? 'field';
        const value = error.keyValue?.[field];

        throw new ConflictException({
          errorCode: 'DUPLICATE_KEY',
          message: `${field} already exists`,
          details: { [field]: value },
        });
      }

      throw error;
    }
  }

  async countDocuments(query: FilterUsersDto): Promise<number> {
    const filterQuery = cleanObject(buildQuery(query));
    return this.userModel.countDocuments(filterQuery).lean();
  }

  async findAll(query: FilterUsersDto): Promise<IResponse<User[]>> {
    const filterQuery = cleanObject(buildQuery(query));
    const { limit, page, sort } = extractQueryParams(query);

    const [products, total] = await Promise.all([
      this.userModel.find(filterQuery).limit(limit).skip(page * limit).sort({ ...sort }).lean(),
      this.countDocuments(query)
    ]);

    const meta = getQueryMetadata(query, total);

    return { data: products, meta };
  }

  async findById(id: string, _options?: any): Promise<User> {
    const user = await this.userModel.findOne({ _id: id });

    if (!user) throw new NotFoundException('User not found');

    return user.toJSON();
  }

  async findUserBalances(userId: string) {
    const user = await this.userModel.findOne({ _id: userId }).lean();

    if (!user) throw new NotFoundException('User not found');

    return user.balances;
  }

  async updateById(userId: string, updateData: UpdateUserDto) {
    await this.findById(userId);

    const updatedUser = await this.userModel.findByIdAndUpdate(userId, updateData);

    return updatedUser?.toJSON();
  }

  /**
   * IMPORTANT: blocks if balance would go negative.
   * Returns { modifiedCount } so service can throw if 0.
   */
  decBalanceIfEnough(
    userId: string,
    currency: ECurrency,
    amount: number,
    session: ClientSession,
  ) {
    const balancePath = `balances.${currency}`;

    return this.userModel.updateOne(
      { _id: new Types.ObjectId(userId), [balancePath]: { $gte: amount } },
      { $inc: { [balancePath]: -amount }, $set: { updatedAt: new Date() } },
      { session },
    );
  }

  incBalance(
    userId: string,
    currency: ECurrency,
    amount: number,
    session: ClientSession,
  ) {
    const balancePath = `balances.${currency}`;

    return this.userModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      { $inc: { [balancePath]: amount }, $set: { updatedAt: new Date() } },
      { session },
    );
  }

  // async findByUsername(username: string): Promise<User> {
  //   const user = await this.userModel.findOne({ username }).lean();

  //   if (!user) throw new NotFoundException('User not found');

  //   // if (!user.verified) throw new HttpException('Account is pending verification. Please check your email for instructions.', 202);

  //   return user;
  // }
}
