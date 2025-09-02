import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { CustomerData } from './customer-data.entity';

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn()
  cartItemId: number;

  @Column()
  productId: number;

  @Column()
  quantity: number;

  @ManyToOne(() => CustomerData, (customerData) => customerData.cart)
  customerData: CustomerData;

  @Column()
  customerDataId: number;
}