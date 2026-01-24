  /**
 * gRPC Server Adapter for Web3 Service
 *
 * Implements the gRPC server that receives Web3 operation requests
 * from other services and returns responses.
 */

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as path from "path";
import * as fs from "fs";
import { Logger, PathUtils, ConsoleLogger } from "@vbar/shared";
import { WalletHandler } from "./handlers/WalletHandler";
import { TransactionHandler } from "./handlers/TransactionHandler";
import { TokenHandler } from "./handlers/TokenHandler";
import { ContractHandler } from "./handlers/ContractHandler";

// Define the proto file path - from shared package
const projectRoot = PathUtils.findProjectRoot(__dirname);
const PROTO_PATH = path.join(
  projectRoot,
  "packages/shared/proto/web3_service.proto"
);

// Verify proto file exists
if (!fs.existsSync(PROTO_PATH)) {
  throw new Error(
    `Proto file not found at: ${PROTO_PATH}. ` +
      `Project root: ${projectRoot}, __dirname: ${__dirname}`
  );
}

// Load the proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// Load the package definition
const web3Proto = grpc.loadPackageDefinition(packageDefinition) as any;

/**
 * Creates and configures the gRPC server
 *
 * @param logger - Logger instance for logging
 * @returns Configured gRPC server instance
 */
export function createGrpcServer(logger: Logger): grpc.Server {
  const server = new grpc.Server();

  // Create logger instance
  const serviceLogger = new ConsoleLogger("Web3Service");

  // Create handlers
  const walletHandler = new WalletHandler(serviceLogger);
  const transactionHandler = new TransactionHandler(serviceLogger);
  const tokenHandler = new TokenHandler(serviceLogger);
  const contractHandler = new ContractHandler(serviceLogger);

  // Implement the Web3Service RPC methods
  server.addService(web3Proto.web3.Web3Service.service, {
    // Wallet operations
    CreateWallet: walletHandler.createWallet.bind(walletHandler),
    GetBalance: walletHandler.getBalance.bind(walletHandler),
    GetWalletInfo: walletHandler.getWalletInfo.bind(walletHandler),
    ListWallets: walletHandler.listWallets.bind(walletHandler),

    // Transaction operations
    SendTransaction: transactionHandler.sendTransaction.bind(transactionHandler),
    TrackTransaction: transactionHandler.trackTransaction.bind(
      transactionHandler
    ),
    GetTransactionHistory: transactionHandler.getTransactionHistory.bind(
      transactionHandler
    ),

    // Token operations
    GetTokenBalance: tokenHandler.getTokenBalance.bind(tokenHandler),
    TransferToken: tokenHandler.transferToken.bind(tokenHandler),
    GetTokenInfo: tokenHandler.getTokenInfo.bind(tokenHandler),
    GetNFTs: tokenHandler.getNFTs.bind(tokenHandler),
    TransferNFT: tokenHandler.transferNFT.bind(tokenHandler),

    // Smart contract operations
    ReadContract: contractHandler.readContract.bind(contractHandler),
    WriteContract: contractHandler.writeContract.bind(contractHandler),
    StoreContractABI: contractHandler.storeContractABI.bind(contractHandler),
    GetContractABI: contractHandler.getContractABI.bind(contractHandler),
  });

  return server;
}

