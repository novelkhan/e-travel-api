import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { CustomerData } from './customer-data.entity';

@Entity('customer_files')
export class CustomerFile {
  @PrimaryGeneratedColumn()
  customerFileId: number;

  @Column()
  filename: string;

  @Column()
  filetype: string;

  @Column()
  filesize: string;

  @Column('bytea')
  filebytes: Buffer;

  @ManyToOne(() => CustomerData, (customerData) => customerData.customerFiles)
  customerData: CustomerData;

  @Column()
  customerDataId: number;
}