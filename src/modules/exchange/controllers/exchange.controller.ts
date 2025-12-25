import { Controller, Post, Body, Get, Query } from '@nestjs/common';

import { ExchangeService } from '../services/exchange.service';
import { CreateExchangeDto } from '../dto/create-exchange.dto';
import { FilterExchangeDto } from '../dto/filter-exchange.dto';

@Controller('exchanges')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Post()
  create(@Body() createExchangeDto: CreateExchangeDto) {
    return this.exchangeService.create(createExchangeDto);
  }

  @Get('/')
  findAll(@Query() query: FilterExchangeDto) {
    return this.exchangeService.findAll(query);
  }
}
