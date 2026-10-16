'use client';

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@ai-matrx/design-system/controls';

interface Spare {
  phone_number: string;
}

interface Pool {
  available: number;
  kept_on_hand: number;
  shortfall: number;
}

async function call(body: Record<string, unknown>) {
  const response = await fetch('/api/sms/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: response.ok, json: await response.json() };
}

export default function SpareNumbers() {
  const [spares, setSpares] = useState<Spare[]>([]);
  const [pool, setPool] = useState<Pool | null>(null);
  const [organizationId, setOrganizationId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { ok, json } = await call({ action: 'list_spares' });
    if (!ok) {
      setMessage(json.msg ?? 'Could not load the spare numbers');
      return;
    }
    setSpares(json.data.spares);
    setPool(json.data.pool);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const assign = async (phoneNumber: string) => {
    const { ok, json } = await call({ action: 'assign_spare', organization_id: organizationId.trim(), phone_number: phoneNumber });
    setMessage(ok ? `Assigned ${json.data.phone_number}` : json.msg);
    await load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign a number</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Organization id" value={organizationId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrganizationId(e.target.value)} />
        {pool && pool.shortfall > 0 && (
          <p className="text-sm text-foreground">
            {pool.available} spares left, {pool.kept_on_hand} kept on hand: buy {pool.shortfall} more.
          </p>
        )}
        {spares.map((spare) => (
          <div key={spare.phone_number} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{spare.phone_number}</span>
            <Button disabled={!organizationId.trim()} onClick={() => assign(spare.phone_number)}>
              Assign
            </Button>
          </div>
        ))}
        {message && <p className="text-sm text-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
