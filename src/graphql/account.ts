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
      kind
      reason
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

// Confirms a payment of the signed-in member. The API checks with the payment
// provider that the money was received before crediting the account.
export const CONFIRM_PAYMENT = gql`
  mutation ConfirmPayment($paymentId: String!) {
    confirmPayment(paymentId: $paymentId) {
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

// An administrator credits or debits a member's account by hand, with a reason.
export const ADJUST_MEMBER_BALANCE = gql`
  mutation AdjustMemberBalance($input: AdjustBalanceInput!) {
    adjustMemberBalance(input: $input) {
      id
      amount
      kind
      reason
      payment_method
      payment_date
      user {
        id
        user_account_balance
      }
    }
  }
`;

// The invoices of a member: their own, or any member's for an administrator.
export const GET_MEMBER_INVOICES = gql`
  query GetMemberInvoices($userId: Int!) {
    invoicesByUser(userId: $userId) {
      id
      invoice_number
      invoice_date
      amount
      payment_status
      payment_method
    }
  }
`;

// One invoice as a PDF (base64), written in the language of the interface.
export const GET_INVOICE_DOCUMENT = gql`
  query GetInvoiceDocument($id: Int!) {
    invoiceDocument(id: $id) {
      fileName
      content
    }
  }
`;
