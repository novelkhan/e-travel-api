import { IsNotEmpty } from 'class-validator';

export class AddPackageDto {
  @IsNotEmpty({ message: 'Package name is required' })
  packagename: string;

  @IsNotEmpty({ message: 'Destination is required' })
  destination: string;

  @IsNotEmpty({ message: 'Price is required' })
  price: number;
}