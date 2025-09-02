import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  orderItemId: number;

  @Column()
  productId: number;

  @Column()
  productName: string;

  @Column('bytea', { nullable: true })
  productImage: Buffer;

  @Column()
  quantity: number;

  @Column('float')
  perUnitPrice: number;

  @Column('float')
  totalPrice: number;

  @ManyToOne(() => Order, (order) => order.orderItems)
  order: Order;

  @Column()
  orderId: number;
}