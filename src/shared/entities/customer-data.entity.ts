import { Entity, PrimaryGeneratedColumn, OneToMany, ManyToOne, Column } from 'typeorm';
import { User } from './user.entity';
import { CustomerFile } from './customer-file.entity';
import { CartItem } from './cart-item.entity';

@Entity('customer_data')
export class CustomerData {
  @PrimaryGeneratedColumn()
  customerDataId: number;

  @OneToMany(() => CustomerFile, (customerFile) => customerFile.customerData)
  customerFiles: CustomerFile[];

  @OneToMany(() => CartItem, (cartItem) => cartItem.customerData)
  cart: CartItem[];

  @ManyToOne(() => User, (user) => user.customerData)
  user: User;

  @Column()
  userId: string;
}