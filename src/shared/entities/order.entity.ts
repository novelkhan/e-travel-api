import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  orderId: number;

  @Column()
  customerId: string;

  @Column({ type: 'timestamp' })
  orderDate: Date;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  orderItems: OrderItem[];

  @Column('float')
  totalAmount: number;

  @Column({ default: false })
  isPaid: boolean;

  @Column({ default: false })
  isShipped: boolean;

  @Column({ type: 'timestamp', nullable: true })
  shippingDate: Date;
}