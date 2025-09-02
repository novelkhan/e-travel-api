import { Entity, Column, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { PackageImage } from './package-image.entity';
import { Package } from './package.entity';
import { IsNotEmpty } from 'class-validator';

@Entity('PackageDatas')
export class PackageData {
  @PrimaryGeneratedColumn()
  packageDataId: number;

  @Column()
  description: string;

  @Column({ nullable: true })
  viaDestination: string | null;

  @Column({ type: 'timestamp' })
  @IsNotEmpty({ message: 'Date is required' })
  date: Date;

  @Column()
  availableSeat: number;

  @Column()
  @IsNotEmpty({ message: 'PackageId is required' })
  packageId: number;

  @OneToMany(() => PackageImage, (packageImage) => packageImage.packageData, { nullable: true })
  packageImages: PackageImage[] | null;

  @OneToOne(() => Package, (pkg) => pkg.packageData)
  @JoinColumn({ name: 'packageId' })
  package: Package;
}