import React from 'react';
import { Outlet } from '@remix-run/react';
import { AppLayout } from '~/components/layout/AppLayout';

export default function AppRoute() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}