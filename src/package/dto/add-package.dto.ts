import { IsString, IsNotEmpty, IsNumber, IsDateString, IsArray, IsOptional } from 'class-validator';

export class AddPackageDto {
  @IsString()
  @IsNotEmpty()
  packageName: string;

  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsNumber()
  price: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  viaDestination?: string;

  @IsDateString()
  date: string;

  @IsNumber()
  availableSeat: number;

  @IsArray()
  @IsOptional()
  images?: { filename: string; filetype: string; filesize: string; filebytes: string }[];
}