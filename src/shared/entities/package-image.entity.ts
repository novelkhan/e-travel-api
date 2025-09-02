import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { PackageData } from './package-data.entity';
import { IsNotEmpty } from 'class-validator';

@Entity('PackageImages')
export class PackageImage {
  @PrimaryGeneratedColumn()
  packageImageId: number;

  @Column()
  @IsNotEmpty({ message: 'Filename is required' })
  filename: string;

  @Column()
  @IsNotEmpty({ message: 'Filetype is required' })
  filetype: string;

  @Column({ nullable: true })
  filesize: string | null;

  @Column({ type: 'bytea', nullable: true })
  filebytes: Buffer | null;

  @Column()
  @IsNotEmpty({ message: 'PackageDataId is required' })
  packageDataId: number;

  @ManyToOne(() => PackageData, (packageData) => packageData.packageImages)
  packageData: PackageData;
}