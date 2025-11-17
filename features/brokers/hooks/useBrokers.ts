import { useState, useEffect } from 'react';
import { BrokerService } from '../services/core-broker-crud';
import type { DataBroker, BrokerContext, CompleteBrokerData } from '../types';

export function useBrokers(userId?: string) {
  const [brokers, setBrokers] = useState<DataBroker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadBrokers();
  }, [userId]);

  const loadBrokers = async () => {
    try {
      setLoading(true);
      const data = await BrokerService.getBrokers(userId);
      setBrokers(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { brokers, loading, error, refetch: loadBrokers };
}

export function useBrokerValuesForContext(
  brokerIds: string[],
  context: BrokerContext
) {
  const [data, setData] = useState<CompleteBrokerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (brokerIds.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    loadBrokerData();
  }, [brokerIds, context]);

  const loadBrokerData = async () => {
    try {
      setLoading(true);
      const result = await BrokerService.getCompleteBrokerDataForContext(
        brokerIds,
        context
      );
      setData(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: loadBrokerData };
}