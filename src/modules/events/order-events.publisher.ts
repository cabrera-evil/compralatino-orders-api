import { OrderEventPattern } from '@/constants/events';
import { RABBITMQ_SERVICE } from '@/constants/rabbitmq';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

export interface OrderEventItem {
	productCode: string;
	quantity: number;
	unitPrice: string;
}

export interface OrderCreatedEvent {
	eventId: string;
	orderId: number;
	userId: number;
	status: string;
	totalAmount: string;
	totalAmountJpy: string | null;
	orderDate: string;
	intentSource: string | null;
	items: OrderEventItem[];
}

export interface OrderUpdatedEvent {
	eventId: string;
	orderId: number;
	userId: number;
	status: string;
	previousStatus: string;
	updatedAt: string;
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
		this.client.emit(pattern, payload).subscribe({
			error: (error: unknown) =>
				this.logger.error(`Failed to publish "${pattern}": ${String(error)}`),
		});
	}

	publishOrderCreated(payload: OrderCreatedEvent): void {
		this.emit(OrderEventPattern.CREATED, payload);
	}

	publishOrderUpdated(payload: OrderUpdatedEvent): void {
		this.emit(OrderEventPattern.UPDATED, payload);
	}
}
