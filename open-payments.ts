import dotenv from "dotenv";
import {
  type WalletAddress,
  type AuthenticatedClient,
  type Grant,
  createAuthenticatedClient,
  type PendingGrant,
  isPendingGrant,
} from "@interledger/open-payments";
import { randomUUID } from "crypto";
import { type components } from "@interledger/open-payments/dist/openapi/generated/auth-server-types";

dotenv.config({ path: ".env" });

export async function getAuthenticatedClient() {
  let walletAddress = process.env.OPEN_PAYMENTS_CLIENT_ADDRESS;

  if (walletAddress && walletAddress.startsWith("$")) {
    walletAddress = walletAddress.replace("$", "https://");
  }

  const client = await createAuthenticatedClient({
    walletAddressUrl: process.env.OPEN_PAYMENTS_CLIENT_ADDRESS ?? "",
    privateKey: process.env.OPEN_PAYMENTS_SECRET_KEY_PATH ?? "",
    keyId: process.env.OPEN_PAYMENTS_KEY_ID ?? "",
  });

  return client;
}

export async function getWalletAddressInfo(
  client: AuthenticatedClient,
  walletAddress: string
): Promise<{ walletAddress: string; walletAddressDetails: WalletAddress }> {
  if (walletAddress.startsWith("$"))
    walletAddress = walletAddress.replace("$", "https://");

  const walletAddressDetails = await client.walletAddress.get({
    url: walletAddress,
  });

  return { walletAddress, walletAddressDetails };
}

/**
 * The method requests a grant from the receivers auth server for creating an incoming payment grant
 * After receiving the grant the incoming payment resource is created
 *
 * @param client
 * @param value - payment amount to be made
 * @param walletAddressDetails - wallet address details for the receiver
 * @returns
 */
export async function createIncomingPayment(
  client: AuthenticatedClient,
  value: string,
  walletAddressDetails: WalletAddress
) {
  console.log(">> Creating Incoming Payment Resource");
  console.log(walletAddressDetails);

  // TODO: Request IP grant
  const grant: PendingGrant | Grant | undefined = undefined;

  if (grant && isPendingGrant(grant)) {
    throw new Error("Expected non-interactive grant");
  }

  // TODO: create incoming payment
  const incomingPayment: any = undefined;

  console.log("<< Resource created");
  console.log(incomingPayment);

  return incomingPayment;
}

/**
 * The method requests a grant to create a qoute on the senders resource server
 * The qoute is then created on the senders resource server
 *
 * @param client
 * @param incomingPaymentUrl - identifier for the incoming payment the qoute is being created for
 * @param walletAddressDetails - wallet address details for the sender
 * @returns
 */
export async function createQoute(
  client: AuthenticatedClient,
  incomingPaymentUrl: string,
  walletAddressDetails: WalletAddress
) {
  console.log(">> Creating quoute");
  console.log(walletAddressDetails);

  // TODO: Request Qoute grant
  const grant: PendingGrant | Grant | undefined = undefined;

  if (grant && isPendingGrant(grant)) {
    throw new Error("Expected non-interactive grant");
  }

  // TODO: create qoute
  const qoute: any = undefined;

  console.log("<< Qoute created");
  console.log(qoute);

  return qoute;
}

/**
 * This method creates a pending grant which must be authorized by the user
 * After it is authorized the continuation access token we receive can be used to get the actual OP creation grant
 * Tells the client to go ask sender for approval and details of where to come back to continue the process
 *
 * @param client
 * @param input - details from the qoute
 * @param walletAddressDetails - wallet address details for the sender
 * @returns
 */
export async function getOutgoingPaymentAuthorization(
  client: AuthenticatedClient,
  input: any,
  walletAddressDetails: WalletAddress
): Promise<PendingGrant | undefined> {
  console.log(">> Getting link to authorize outgoing payment grant request");
  console.log(walletAddressDetails);

  const dateNow = new Date().toISOString();
  const debitAmount = input.debitAmount;
  const receiveAmount = input.receiveAmount;

  // TODO: Request outgoing payment pending grant
  const grant: PendingGrant | Grant | undefined = undefined;

  if (grant && !isPendingGrant(grant)) {
    throw new Error("Expected interactive grant");
  }

  console.log("<< Pending outgoing grant obtained");
  return grant;
}

/**
 * This method will now get the grant if the user has given permission
 * The grant is then used to create the outgoing payment
 *
 * @param client
 * @param input
 * @returns
 */
export async function createOutgoingPayment(
  client: AuthenticatedClient,
  input: any
) {
  let walletAddress = input.senderWalletAddress;
  if (walletAddress.startsWith("$"))
    walletAddress = walletAddress.replace("$", "https://");

  console.log(">> Creating outgoing payment");
  console.log(input);

  // TODO: Get the grant since it was still pending
  const grant: PendingGrant | Grant | undefined = undefined;

  console.log("<< Outgoing payment grant");
  console.log(grant);

  if (grant && isPendingGrant(grant)) {
    throw new Error("Expected non-interactive grant");
  }

  // TODO: create outgoing payment
  const outgoingPayment: any = undefined;

  console.log("<< Outgoing payment created");
  console.log(outgoingPayment);

  return outgoingPayment;
}

/**
 * This method creates an outgoing payment for a recurring payment
 *
 * @param client
 * @param input
 * @returns
 */
export async function processSubscriptionPayment(
  client: AuthenticatedClient,
  input: any
) {
  // rotate the token
  const token = await client.token.rotate({
    url: input.manageUrl,
    accessToken: input.previousToken,
  });

  if (!token.access_token) {
    console.error("!! Failed to rotate token.");
  }

  console.log("<< Rotated Token ");
  console.log(token.access_token);

  const tokenAccessDetails = token.access_token.access as {
    type: "outgoing-payment";
    actions: ("create" | "read" | "read-all" | "list" | "list-all")[];
    identifier: string;
    limits?: components["schemas"]["limits-outgoing"];
  }[];

  const receiveAmount = (tokenAccessDetails[0].limits as any).receiveAmount
    ?.value;

  const { walletAddressDetails: receiverWalletAddressDetails } =
    await getWalletAddressInfo(client, input.receiverWalletAddress);

  const {
    walletAddress: senderWalletAddress,
    walletAddressDetails: senderWalletAddressDetails,
  } = await getWalletAddressInfo(
    client,
    tokenAccessDetails[0]?.identifier ?? ""
  );

  // create incoming payment
  const incomingPayment = await createIncomingPayment(
    client,
    receiveAmount!,
    receiverWalletAddressDetails
  );

  // create qoute
  const quote = await createQoute(
    client,
    incomingPayment.id,
    senderWalletAddressDetails
  );

  // create outgoing payment
  try {
    const outgoingPayment = await client.outgoingPayment.create(
      {
        url: new URL(senderWalletAddress).origin,
        accessToken: token.access_token.value, //OUTGOING_PAYMENT_ACCESS_TOKEN,
      },
      {
        walletAddress: senderWalletAddress,
        quoteId: quote.id, //QUOTE_URL,
      }
    );

    return outgoingPayment;
  } catch (error) {
    console.log(error);
    throw new Error("Error creating subscription outgoing payment");
  }
}
