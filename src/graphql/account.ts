import { gql } from '@apollo/client';

export const GET_USER_DATA = gql`
  query GetUserPayments($userId: Int!) {
    paymentsByUser(userId: $userId) {
      id
      amount
      payment_date
      payment_method
      payment_status
      external_payment_id
      user {
        id
        first_name
        last_name
        user_account_balance
      }
      invoice {
        id
        amount
        invoice_date
        payment_status
        payment_method
        invoice_items
        amount_paid
        balance_due
        next_payment_due_date
      }
    }
  }
`;

export const CREATE_PAYMENT = gql`
  mutation CreatePayment($createPaymentInput: CreatePaymentInput!) {
    createPayment(createPaymentInput: $createPaymentInput) {
      id
      amount
      payment_method
      payment_status
      external_payment_id
    }
  }
`;

export const PROCESS_PAYMENT = gql`
  mutation ProcessPayment($createPaymentInput: CreatePaymentInput!) {
    processPayment(createPaymentInput: $createPaymentInput) {
      id
      amount
      payment_method
      payment_status
      external_payment_id
      client_secret
      user {
        id
        first_name
        last_name
        user_account_balance
      }
    }
  }
`;

export const UPDATE_PAYMENT_STATUS = gql`
  mutation UpdatePaymentStatus($paymentId: String!, $status: String!) {
    updatePaymentStatus(paymentId: $paymentId, status: $status) {
      id
      payment_status
      external_payment_id
      amount
      payment_method
      user {
        id
      }
    }
  }
`;

export const PROCESS_REFUND = gql`
  mutation ProcessRefund($paymentIntentId: String!, $amount: Float!) {
    processRefund(paymentIntentId: $paymentIntentId, amount: $amount) {
      id
      payment_status
    }
  }
`;
