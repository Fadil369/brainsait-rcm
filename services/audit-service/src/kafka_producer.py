"""
Audit Service - Kafka Producer

Kafka producer for streaming audit events.
"""
from kafka import KafkaProducer
from typing import Dict, Any
import json
import logging

logger = logging.getLogger(__name__)


class KafkaAuditProducer:
    """
    Kafka producer for audit events.
    
    Streams audit events to Kafka topic for real-time processing
    and downstream consumers (analytics, alerting, etc.).
    """
    
    def __init__(self, brokers: str, topic: str):
        """
        Initialize Kafka producer.
        
        Args:
            brokers: Comma-separated list of Kafka broker addresses
            topic: Kafka topic for audit events
        """
        self.brokers = brokers.split(',')
        self.topic = topic
        self.producer: KafkaProducer = None
        self._connected = False
    
    async def start(self):
        """Start Kafka producer"""
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=self.brokers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                acks='all',  # Wait for all replicas
                retries=3,
                max_in_flight_requests_per_connection=1  # Ensure ordering
            )
            self._connected = True
            logger.info(f"Kafka producer connected to {self.brokers}")
        except Exception as e:
            logger.error(f"Failed to start Kafka producer: {e}")
            self._connected = False
    
    async def stop(self):
        """Stop Kafka producer"""
        if self.producer:
            self.producer.close()
            self._connected = False
            logger.info("Kafka producer stopped")
    
    def is_connected(self) -> bool:
        """Check if producer is connected"""
        return self._connected
    
    async def send_event(self, event: Dict[str, Any]):
        """
        Send audit event to Kafka.
        
        Args:
            event: Audit event dictionary
        """
        if not self._connected or not self.producer:
            logger.warning("Kafka producer not connected, skipping event")
            return
        
        try:
            # Use audit_id as key for partitioning
            key = event.get("audit_id")
            
            # Send to Kafka
            future = self.producer.send(
                self.topic,
                key=key,
                value=event
            )
            
            # Wait for send to complete (with timeout)
            record_metadata = future.get(timeout=10)
            
            logger.debug(
                f"Audit event sent to Kafka: topic={record_metadata.topic}, "
                f"partition={record_metadata.partition}, offset={record_metadata.offset}"
            )
            
        except Exception as e:
            logger.error(f"Failed to send event to Kafka: {e}")
            # Don't raise - audit should still be stored in MongoDB
