'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery } from '@apollo/client';
import { GET_USER_DATA } from '@/graphql/account';
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useEffect, useState } from "react";
import { useDecodedToken, useUserData } from "../hooks/userHooks";

export default function AccountOverview() {
  const userEmail = useDecodedToken();
  const userData = useUserData(userEmail);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (userData) {
      setUserId(userData.id);
    }
  }, [userData]);

  const { data, loading, error } = useQuery(GET_USER_DATA, {
    variables: { userId },
    fetchPolicy: 'network-only',
  });

  if (loading) return <Skeleton className="h-[200px] w-full" />;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          {error.message || "Impossible de charger les données du compte."}
        </AlertDescription>
      </Alert>
    );
  }

  const userBalance = data?.paymentsByUser?.[0]?.user?.user_account_balance || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solde du Compte</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold">€{userBalance.toFixed(2)}</p>
      </CardContent>
    </Card>
  )
}
