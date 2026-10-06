import { OrderEventPattern } from '@/constants/events';
import { RABBITMQ_SERVICE } from '@/constants/rabbitmq';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

export interface OrderCreatedEvent {
	orderId: number;
	userId: number;
	status: string;
	totalAmount: string;
	orderDate: string;
}

export interface OrderUpdatedEvent {
	orderId: number;
	status: string;
}

@Injectable()
export class OrderEventsPublisher {
	private readonly logger = new Logger(OrderEventsPublisher.name);

	constructor(
		@Optional()
		@Inject(RABBITMQ_SERVICE)
		private readonly client?: ClientProxy
	) {}

	private emit(pattern: string, payload: unknown): void {
		if (!this.client) {
			this.logger.warn(
				`RabbitMQ is disabled — skipping "${pattern}" event. Set RABBITMQ_ENABLED=true to publish.`
			);
			return;
		}
		this.client.emit(pattern, payload);
	}

	publishOrderCreated(payload: OrderCreatedEvent): void {
		this.emit(OrderEventPattern.CREATED, payload);
	}

	publishOrderUpdated(payload: OrderUpdatedEvent): void {
		this.emit(OrderEventPattern.UPDATED, payload);
	}
}
