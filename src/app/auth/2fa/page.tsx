'use client';

import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Loader2 } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMutation } from "@apollo/client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { VERIFY_2FA_SECRET } from "@/graphql/user";
import { useToast } from "@/components/hooks/use-toast";
import { AuthCard, AuthLink, FieldError } from "@/app/auth/_components/AuthCard";

const CODE_LENGTH = 6;

export default function TwoFactorAuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [verify2FASecret, { loading }] = useMutation(VERIFY_2FA_SECRET);

  useEffect(() => {
    const email = sessionStorage.getItem('2fa_pending_email');
    if (!email) {
      toast({
        variant: "destructive",
        title: "Session expirée",
        description: "Veuillez vous reconnecter.",
      });
      router.push('/');
      return;
    }
    setPendingEmail(email);
  }, [router, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pendingEmail) {
      toast({
        variant: "destructive",
        title: "Session expirée",
        description: "Veuillez vous reconnecter.",
      });
      router.push('/');
      return;
    }

    if (otp.length < CODE_LENGTH) {
      setCodeError(`Saisissez les ${CODE_LENGTH} chiffres du code.`);
      return;
    }

    try {
      await verify2FASecret({
        variables: {
          email: pendingEmail,
          token: otp,
        },
      });

      sessionStorage.removeItem('2fa_pending_email');
      router.push("/dashboard");
    } catch {
      setCodeError("Ce code est invalide ou a expiré. Saisissez le code actuellement affiché par votre application.");
      setOtp("");
    }
  };

  return (
    <AuthCard
      title="Double authentification"
      description="Saisissez le code à 6 chiffres affiché par votre application d'authentification."
      footer={<AuthLink href="/">Retour à la connexion</AuthLink>}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="flex flex-col items-center gap-1.5">
          <Label htmlFor="otp">Code de vérification</Label>
          <InputOTP
            id="otp"
            maxLength={CODE_LENGTH}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={otp}
            onChange={(value) => {
              setOtp(value);
              setCodeError(null);
            }}
            disabled={loading}
            aria-invalid={!!codeError}
            aria-describedby={codeError ? "otp-error" : undefined}
          >
            <InputOTPGroup>
              {Array.from({ length: CODE_LENGTH }, (_, index) => (
                <InputOTPSlot key={index} index={index} className="h-11 w-11 text-base" />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <FieldError id="otp-error">{codeError}</FieldError>
        </div>
        <Button type="submit" disabled={loading || !pendingEmail || otp.length < CODE_LENGTH} className="w-full">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Vérifier le code
        </Button>
      </form>
    </AuthCard>
  );
}
