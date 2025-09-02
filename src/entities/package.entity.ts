import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { PackageData } from './package-data.entity';
import { IsNotEmpty } from 'class-validator';

@Entity('Packages')
export class Package {
  @PrimaryGeneratedColumn()
  packageId: number;

  @Column()
  @IsNotEmpty({ message: 'PackageName is required' })
  packageName: string;

  @Column()
  @IsNotEmpty({ message: 'Destination is required' })
  destination: string;

  @Column()
  @IsNotEmpty({ message: 'Price is required' })
  price: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateCreated: Date;

  @OneToOne(() => PackageData, (packageData) => packageData.package, { nullable: true })
  packageData: PackageData | null;
}