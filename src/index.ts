import { Web3 } from "web3";
import BN from "bn.js";
import kleur from "kleur";
import promptSync from "prompt-sync";
import type { Web3Account } from "web3-eth-accounts";
import { abi } from "./abi";
import dotenv from "dotenv";
import { PHAROS_CONFIG } from "./config";
import { displayHeader } from "./display-header";
import {
  calculateDelayUntilNextRun,
  countdown,
  delay,
  delayWithProgress,
  validateHour,
  validateMinute,
  validateMode,
  validatePositiveNumber,
} from "./utils";

dotenv.config();

interface AppConfig {
  rpc: string;
  privateKeys: string[];
  wethAddress: string;
  mode: "auto" | "manual";
  totalTx: number;
  delayMinutes: number;
  gasPriceMultiplier: number;
  runHour?: number;
  runMinute?: number;
  amounts: string[];
  autoSendEnabled: boolean;
  sendAmount: string;
  targetAddressCount: number;
}

interface TransactionResult {
  address: string;
  status: "success" | "failed";
  error?: string;
  transactionHash?: string;
}

interface CheckinResult {
  address: string;
  status: "success" | "failed";
  error?: string;
}

interface AccountAuth {
  address: string;
  account: Web3Account;
  jwtToken?: string;
}

interface SendEthResult {
  fromAddress: string;
  toAddress: string;
  amount: string;
  status: "success" | "failed";
  error?: string;
  transactionHash?: string;
}

function generateRandomAddress(): string {
  const chars = "0123456789abcdef";
  let address = "0x";
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

function generateRandomAddresses(count: number): string[] {
  const addresses: string[] = [];
  for (let i = 0; i < count; i++) {
    addresses.push(generateRandomAddress());
  }
  return addresses;
}

function displayConfiguration(config: AppConfig): void {
  console.log(kleur.yellow().bold("📋 Configuration Settings:"));
  console.log("━".repeat(50));
  console.log(
    `${kleur.blue("Mode:")} ${kleur.white().bold(config.mode.toUpperCase())}`
  );
  console.log(
    `${kleur.blue("Total Transactions (swap):")} ${kleur
      .white()
      .bold(config.totalTx)} per account`
  );
  console.log(
    `${kleur.blue("Delay Between Tx (swap):")} ${kleur
      .white()
      .bold(config.delayMinutes)} minutes`
  );
  console.log(
    `${kleur.blue("Gas Price Multiplier (swap):")} ${kleur
      .white()
      .bold(config.gasPriceMultiplier)}x`
  );
  console.log(
    `${kleur.blue("Total Accounts:")} ${kleur
      .white()
      .bold(config.privateKeys.length)}`
  );

  console.log(
    `${kleur.blue("Auto Send ETH:")} ${kleur
      .white()
      .bold(config.autoSendEnabled ? "ENABLED" : "DISABLED")}`
  );

  if (config.autoSendEnabled) {
    console.log(
      `${kleur.blue("Send Amount:")} ${kleur
        .white()
        .bold(config.sendAmount)} ETH per transaction`
    );
    console.log(
      `${kleur.blue("Target Addresses:")} ${kleur
        .white()
        .bold(config.targetAddressCount)} random addresses`
    );
  }

  if (
    config.mode === "auto" &&
    config.runHour !== undefined &&
    config.runMinute !== undefined
  ) {
    console.log(
      `${kleur.blue("Scheduled Time:")} ${kleur
        .white()
        .bold(
          `${config.runHour.toString().padStart(2, "0")}:${config.runMinute
            .toString()
            .padStart(2, "0")}`
        )}`
    );
  }

  console.log("━".repeat(50));
  console.log();
}

async function displayAccountsInfo(
  web3: Web3,
  accounts: Web3Account[]
): Promise<void> {
  console.log(
    kleur.yellow().bold("💰 Account Information (for SWAP & SEND ETH):")
  );
  console.log("━".repeat(80));

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    try {
      const balance = await web3.eth.getBalance(account.address);
      const balanceEth = Web3.utils.fromWei(balance, "ether");

      console.log(
        `${kleur.blue(`🔹 Account ${i + 1}`)}: ${kleur.white(account.address)}`
      );
      console.log(
        `   ${kleur.green("Balance")}: ${kleur
          .white()
          .bold(parseFloat(balanceEth).toFixed(4))} ETH`
      );
      console.log(
        `   ${kleur.gray("Usage")}: Used for ${kleur.magenta(
          "SWAP"
        )} and/or ${kleur.cyan("SEND ETH")}`
      );
    } catch (error) {
      console.log(
        `${kleur.blue(`🔹 Account ${i + 1}`)}: ${kleur.white(account.address)}`
      );
      console.log(`${kleur.red("   Balance")}: Error fetching balance`);
    }
  }

  console.log("━".repeat(80));
  console.log();
}

function loadConfiguration(privateKeys: string[]): AppConfig {
  displayHeader();

  console.log(kleur.yellow().bold("🔧 Bot Configuration Setup"));
  console.log("━".repeat(50));

  const prompt = promptSync();

  const mode = validateMode(
    prompt(kleur.blue("➤ Enter SWAP mode (auto/manual): ")).toLowerCase()
  );
  const totalTx = validatePositiveNumber(
    prompt(kleur.blue("🔁 Total SWAP transactions per account: ")),
    "Transaction count"
  );
  const delayMinutes = validatePositiveNumber(
    prompt(kleur.blue("⏱️ Delay between SWAP transactions (minutes): ")),
    "Transaction delay"
  );
  const gasPriceMultiplier = validatePositiveNumber(
    prompt(
      kleur.blue("⛽ Gas price multiplier for SWAP (e.g., 1.2 for 120%): ")
    ),
    "Gas price multiplier"
  );

  console.log(
    "\n" + kleur.yellow("💱 Enter ETH amounts for wrap/unwrap per account:")
  );
  const amounts = privateKeys.map((_, index) =>
    prompt(kleur.blue(`   🔢 Account ${index + 1} amount (ETH): `))
  );

  console.log("\n" + kleur.yellow("🚀 Auto Send ETH Feature Configuration:"));
  const autoSendInput = prompt(
    kleur.blue("💸 Enable Auto Send ETH? (y/n): ")
  ).toLowerCase();
  const autoSendEnabled = autoSendInput === "y" || autoSendInput === "yes";

  let sendAmount = "0";
  let targetAddressCount = 0;

  if (autoSendEnabled) {
    sendAmount = prompt(kleur.blue("💸 ETH amount to send per transaction: "));
    targetAddressCount = validatePositiveNumber(
      prompt(kleur.blue("🎯 Number of random target addresses: ")),
      "Target address count"
    );

    console.log(
      kleur.green(
        `✓ Auto Send ETH enabled → ${sendAmount} ETH × ${targetAddressCount} addresses`
      )
    );
  }

  const config: AppConfig = {
    rpc: PHAROS_CONFIG.RPC_URL,
    privateKeys,
    wethAddress: PHAROS_CONFIG.WETH_ADDRESS,
    mode,
    totalTx,
    delayMinutes,
    gasPriceMultiplier,
    amounts,
    autoSendEnabled,
    sendAmount,
    targetAddressCount,
  };

  if (mode === "auto") {
    console.log("\n" + kleur.yellow("⏰ SWAP Scheduling Setup:"));
    config.runHour = validateHour(
      prompt(kleur.blue("🕐 Hour to run bot (0–23): "))
    );
    config.runMinute = validateMinute(
      prompt(kleur.blue("🕒 Minute to run bot (0–59): "))
    );
  }

  console.log("\n" + kleur.green("✅ Configuration completed successfully!"));
  return config;
}

async function getGasPrice(web3: Web3, multiplier: number): Promise<string> {
  try {
    const gasPrice = await web3.eth.getGasPrice();
    const adjustedGasPrice = new BN(gasPrice.toString()).muln(multiplier);

    return adjustedGasPrice.toString();
  } catch (error) {
    console.error(kleur.red("❌ Error fetching gas price:"), error);
    throw error;
  }
}

async function verifySendTransactionTask(
  address: string,
  txHash: string,
  jwtToken: string
): Promise<void> {
  console.log({
    address,
    txHash,
    jwtToken,
  });
  try {
    const response = await fetch(
      `${PHAROS_CONFIG.API_BASE_URL}/task/verify?address=${address}&task_id=103&tx_hash=${txHash}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          Referer: PHAROS_CONFIG.TESTNET_URL,
        },
      }
    );

    const responseJson = await response.json();
    console.log("response json", responseJson);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    if (responseJson.code === 0 && responseJson.verified) {
      console.log(
        kleur.green("✅ Task verification successful! Transaction sent.")
      );
    } else {
      console.log(
        kleur.red(
          `❌ Task verification failed: ${responseJson.code} - ${responseJson.message}`
        )
      );
    }
  } catch (error) {
    console.error(kleur.red("❌ Error sending transaction:"), error);
  }
}

async function sendEthTransaction(
  web3: Web3,
  account: Web3Account,
  toAddress: string,
  amount: string,
  accountIndex: number,
  gasPriceMultiplier: number,
  jwtToken?: string
): Promise<SendEthResult> {
  try {
    const amountWei = Web3.utils.toWei(amount, "ether");

    console.log(
      kleur.blue(
        `💸 [Account ${
          accountIndex + 1
        }] Sending ${amount} ETH to ${toAddress.substring(0, 10)}...`
      )
    );

    const gasPrice = await getGasPrice(web3, gasPriceMultiplier);
    const gasPriceGwei = Web3.utils.fromWei(gasPrice, "gwei");
    console.log(
      kleur.gray(`   Gas Price: ${parseFloat(gasPriceGwei).toFixed(2)} GWEI`)
    );

    const gasLimit = 21000;
    console.log(kleur.gray(`   Gas Limit: ${gasLimit.toLocaleString()}`));

    const txObject = {
      from: account.address,
      to: toAddress,
      value: amountWei,
      gas: gasLimit,
      gasPrice: gasPrice,
    };

    const receipt = await web3.eth.sendTransaction(txObject);

    const txUrl = `${PHAROS_CONFIG.EXPLORER_URL}/${receipt.transactionHash}`;
    console.log(
      kleur.green(
        `   ✓ Transfer completed! TX: ${receipt.transactionHash
          .toString()
          .substring(0, 10)}...`
      )
    );
    console.log(kleur.gray(`   🔗 Explorer: ${txUrl}`));

    if (jwtToken) {
      console.log(kleur.blue(`   🔄 Verifying transaction...`));
      try {
        await verifySendTransactionTask(
          account.address,
          receipt.transactionHash as string,
          jwtToken
        );
        console.log(kleur.green(`   ✅ Transaction verification completed`));
      } catch (verifyError: any) {
        console.log(
          kleur.yellow(
            `   ⚠️ Transaction verification failed: ${verifyError.message}`
          )
        );
      }
    } else {
      console.log(
        kleur.gray(`   ⚠️ Skipping verification - No JWT token available`)
      );
    }
    return {
      fromAddress: account.address,
      toAddress: toAddress,
      amount: amount,
      status: "success",
      transactionHash: receipt.transactionHash as string,
    };
  } catch (error: any) {
    console.error(kleur.red(`   ❌ Transfer failed: ${error.message}`));
    return {
      fromAddress: account.address,
      toAddress: toAddress,
      amount: amount,
      status: "failed",
      error: error.message,
    };
  }
}

async function performAutoSendEth(
  web3: Web3,
  accountsAuth: AccountAuth[],
  config: AppConfig
): Promise<void> {
  if (!config.autoSendEnabled) {
    return;
  }

  console.log(kleur.cyan().bold("\n💸 Starting Auto Send ETH Process"));
  console.log("━".repeat(50));

  const targetAddresses = generateRandomAddresses(config.targetAddressCount);

  console.log(
    kleur.yellow(
      `📋 Generated ${targetAddresses.length} random target addresses:`
    )
  );
  targetAddresses.forEach((address, index) => {
    console.log(kleur.gray(`   ${index + 1}. ${address}`));
  });
  console.log();

  const results: SendEthResult[] = [];
  let totalSent = 0;
  let successCount = 0;

  for (let accIndex = 0; accIndex < accountsAuth.length; accIndex++) {
    const accountAuth = accountsAuth[accIndex];
    const account = accountAuth.account;

    console.log(
      kleur.blue(
        `\n👤 Processing Account ${accIndex + 1}/${accountsAuth.length}`
      )
    );
    console.log(kleur.gray(`   Address: ${account.address}`));

    try {
      const balance = await web3.eth.getBalance(account.address);
      const balanceEth = parseFloat(Web3.utils.fromWei(balance, "ether"));
      const sendAmountNum = parseFloat(config.sendAmount);
      const estimatedGasCost = 0.001;
      const totalNeeded =
        sendAmountNum * targetAddresses.length + estimatedGasCost;

      console.log(
        kleur.gray(`   💰 Current Balance: ${balanceEth.toFixed(4)} ETH`)
      );
      console.log(
        kleur.gray(`   📊 Total Needed: ${totalNeeded.toFixed(4)} ETH`)
      );

      if (balanceEth < totalNeeded) {
        console.log(
          kleur.yellow(`   ⚠️ Insufficient balance for all transactions`)
        );
        continue;
      }
    } catch (error) {
      console.error(kleur.red(`   ❌ Error checking balance: ${error}`));
      continue;
    }

    for (
      let targetIndex = 0;
      targetIndex < targetAddresses.length;
      targetIndex++
    ) {
      const targetAddress = targetAddresses[targetIndex];

      console.log(
        kleur.cyan(
          `   📤 Transaction ${targetIndex + 1}/${targetAddresses.length}`
        )
      );

      try {
        const result = await sendEthTransaction(
          web3,
          account,
          targetAddress,
          config.sendAmount,
          accIndex,
          config.gasPriceMultiplier,
          accountAuth.jwtToken
        );

        results.push(result);

        if (result.status === "success") {
          successCount++;
          totalSent += parseFloat(config.sendAmount);
        }

        if (targetIndex < targetAddresses.length - 1) {
          console.log(
            kleur.gray(`   ⏳ Waiting 5 seconds before next transaction...`)
          );
          await delay(5000);
        }
      } catch (error: any) {
        console.error(kleur.red(`   ❌ Transaction failed: ${error.message}`));
        results.push({
          fromAddress: account.address,
          toAddress: targetAddress,
          amount: config.sendAmount,
          status: "failed",
          error: error.message,
        });
      }
    }

    if (accIndex < accountsAuth.length - 1) {
      console.log(
        kleur.gray(`   ⏳ Waiting 10 seconds before next account...`)
      );
      await delay(10000);
    }
  }

  console.log(kleur.cyan().bold("\n📊 Auto Send ETH Summary"));
  console.log("━".repeat(40));
  console.log(`${kleur.green("✓ Successful:")} ${successCount} transactions`);
  console.log(
    `${kleur.red("❌ Failed:")} ${results.length - successCount} transactions`
  );
  console.log(`${kleur.blue("💰 Total Sent:")} ${totalSent.toFixed(4)} ETH`);
  console.log(
    `${kleur.blue("📈 Success Rate:")} ${Math.round(
      (successCount / results.length) * 100
    )}%`
  );

  const failedResults = results.filter((r) => r.status === "failed");
  if (failedResults.length > 0) {
    console.log(kleur.red("\n❌ Failed Transactions:"));
    failedResults.forEach((result, index) => {
      console.log(
        kleur.red(
          `   ${index + 1}. ${result.fromAddress} → ${result.toAddress}: ${
            result.error
          }`
        )
      );
    });
  }
}

async function wrapTransaction(
  web3: Web3,
  wethContract: any,
  account: Web3Account,
  amount: BN,
  txNumber: number,
  accountIndex: number,
  gasPriceMultiplier: number
): Promise<TransactionResult> {
  try {
    console.log(
      kleur.blue(
        `📦 [Account ${accountIndex + 1}] Wrapping ${Web3.utils.fromWei(
          amount.toString(),
          "ether"
        )} ETH...`
      )
    );

    const gasPrice = await getGasPrice(web3, gasPriceMultiplier);
    const gasPriceGwei = Web3.utils.fromWei(gasPrice, "gwei");
    console.log(
      kleur.gray(`   Gas Price: ${parseFloat(gasPriceGwei).toFixed(2)} GWEI`)
    );

    const gasEstimate = await wethContract.methods.deposit().estimateGas({
      from: account.address,
      value: amount.toString(),
    });

    console.log(
      kleur.gray(`   Estimated Gas: ${gasEstimate.toLocaleString()}`)
    );

    const receipt = await wethContract.methods.deposit().send({
      from: account.address,
      value: amount.toString(),
      gas: gasEstimate.toString(),
      gasPrice: gasPrice.toString(),
    });

    const txUrl = `${PHAROS_CONFIG.EXPLORER_URL}/${receipt.transactionHash}`;
    console.log(
      kleur.green(
        `   ✓ Wrap completed! TX: ${receipt.transactionHash.substring(
          0,
          10
        )}...`
      )
    );
    console.log(kleur.gray(`   🔗 Explorer: ${txUrl}`));

    return {
      address: account.address,
      status: "success",
      transactionHash: receipt.transactionHash,
    };
  } catch (error: any) {
    console.error(kleur.red(`   ❌ Wrap failed: ${error.message}`));
    return {
      address: account.address,
      status: "failed",
      error: error.message,
    };
  }
}

async function unwrapTransaction(
  web3: Web3,
  wethContract: any,
  account: Web3Account,
  txNumber: number,
  accountIndex: number,
  gasPriceMultiplier: number
): Promise<TransactionResult> {
  try {
    const wethBalance = new BN(
      await wethContract.methods.balanceOf(account.address).call()
    );
    const wethAmount = Web3.utils.fromWei(wethBalance.toString(), "ether");

    console.log(
      kleur.blue(
        `📤 [Account ${accountIndex + 1}] Unwrapping ${parseFloat(
          wethAmount
        ).toFixed(4)} WETH...`
      )
    );

    const gasPrice = await getGasPrice(web3, gasPriceMultiplier);
    const gasPriceGwei = Web3.utils.fromWei(gasPrice, "gwei");
    console.log(
      kleur.gray(`   Gas Price: ${parseFloat(gasPriceGwei).toFixed(2)} GWEI`)
    );

    const gasEstimate = await wethContract.methods
      .withdraw(wethBalance.toString())
      .estimateGas({
        from: account.address,
      });

    console.log(
      kleur.gray(`   Estimated Gas: ${gasEstimate.toLocaleString()}`)
    );

    const receipt = await wethContract.methods
      .withdraw(wethBalance.toString())
      .send({
        from: account.address,
        gas: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
      });

    const txUrl = `${PHAROS_CONFIG.EXPLORER_URL}/${receipt.transactionHash}`;
    console.log(
      kleur.green(
        `   ✓ Unwrap completed! TX: ${receipt.transactionHash.substring(
          0,
          10
        )}...`
      )
    );
    console.log(kleur.gray(`   🔗 Explorer: ${txUrl}`));

    return {
      address: account.address,
      status: "success",
      transactionHash: receipt.transactionHash,
    };
  } catch (error: any) {
    console.error(kleur.red(`   ❌ Unwrap failed: ${error.message}`));
    return {
      address: account.address,
      status: "failed",
      error: error.message,
    };
  }
}

async function retryTransaction(
  transactionFunction: Function,
  args: any[],
  maxRetries: number = 3
): Promise<TransactionResult> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await transactionFunction(...args);
      if (result.status === "success") {
        return result;
      }
      lastError = result.error;
    } catch (error: any) {
      lastError = error;
      console.error(
        kleur.yellow(
          `   ⚠️ Attempt ${attempt}/${maxRetries} failed: ${error.message}`
        )
      );

      if (attempt < maxRetries) {
        const retryDelay = attempt * 2000;
        console.log(kleur.gray(`   ⏳ Retrying in ${retryDelay / 1000}s...`));
        await delay(retryDelay);
      }
    }
  }

  return {
    address: args[2].address,
    status: "failed",
    error: lastError?.message || "Max retries exceeded",
  };
}

async function signMessage(
  web3: Web3,
  account: Web3Account,
  message: string
): Promise<string> {
  try {
    const signature = await web3.eth.accounts.sign(message, account.privateKey);
    return signature.signature;
  } catch (error) {
    console.error("Error signing message:", error);
    throw error;
  }
}

async function signInWithSignature(
  web3: Web3,
  account: Web3Account
): Promise<string> {
  try {
    console.log(`🔐 Starting signature sign-in for ${account.address}`);
    const message = "pharos";
    const signature = await signMessage(web3, account, message);
    console.log(`   ✍️ Message signed: ${signature.substring(0, 10)}...`);

    const response = await fetch(
      `${PHAROS_CONFIG.API_BASE_URL}/user/login?address=${account.address}&signature=${signature}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: PHAROS_CONFIG.TESTNET_URL,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Signature verification failed: ${response.status}`);
    }

    const result = await response.json();

    if (result.data && result.data.jwt) {
      console.log(`   ✅ Sign-in successful! Token received.`);
      return result.data.jwt;
    } else {
      throw new Error("No JWT token received from server");
    }
  } catch (error: any) {
    console.error(`   ❌ Sign-in failed: ${error.message}`);
    throw error;
  }
}

async function authenticateAccounts(
  web3: Web3,
  accounts: Web3Account[]
): Promise<AccountAuth[]> {
  console.log(kleur.cyan().bold("\n🔐 Authenticating Accounts"));
  console.log("━".repeat(50));

  const authenticatedAccounts: AccountAuth[] = [];

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    console.log(
      kleur.blue(`\n🔑 Authenticating Account ${i + 1}/${accounts.length}`)
    );
    console.log(kleur.gray(`   Address: ${account.address}`));

    try {
      const jwtToken = await signInWithSignature(web3, account);
      authenticatedAccounts.push({
        address: account.address,
        account: account,
        jwtToken: jwtToken,
      });
      console.log(kleur.green(`   ✓ Authentication successful`));
    } catch (error: any) {
      console.error(kleur.red(`   ❌ Authentication failed: ${error.message}`));
      authenticatedAccounts.push({
        address: account.address,
        account: account,
      });
    }

    if (i < accounts.length - 1) {
      await delay(2000);
    }
  }

  const successfulAuth = authenticatedAccounts.filter(
    (acc) => acc.jwtToken
  ).length;
  console.log(kleur.cyan().bold("\n📊 Authentication Summary"));
  console.log("━".repeat(40));
  console.log(
    `${kleur.green("✓ Successful:")} ${successfulAuth}/${accounts.length}`
  );
  console.log(
    `${kleur.yellow("⚠ Failed:")} ${accounts.length - successfulAuth}/${
      accounts.length
    }`
  );

  return authenticatedAccounts;
}

async function runTransactions(
  web3: Web3,
  wethContract: any,
  accountsAuth: AccountAuth[],
  config: AppConfig
): Promise<void> {
  console.log(kleur.cyan().bold("\n🚀 Starting Transaction Execution"));
  console.log("━".repeat(60));

  const totalTransactions = config.totalTx * accountsAuth.length;
  let completedTransactions = 0;
  let successfulTransactions = 0;

  for (let txRound = 0; txRound < config.totalTx; txRound++) {
    console.log(
      kleur
        .yellow()
        .bold(`\n🔄 Transaction Round ${txRound + 1}/${config.totalTx}`)
    );
    console.log("─".repeat(40));

    for (let accIndex = 0; accIndex < accountsAuth.length; accIndex++) {
      const accountAuth = accountsAuth[accIndex];
      const account = accountAuth.account;
      const amountPerTx = new BN(
        Web3.utils.toWei(config.amounts[accIndex], "ether")
      );

      console.log(
        kleur.blue(
          `\n👤 Processing Account ${accIndex + 1}/${accountsAuth.length}`
        )
      );
      console.log(kleur.gray(`   Address: ${account.address}`));

      try {
        const wethBalance = new BN(
          await wethContract.methods.balanceOf(account.address).call()
        );

        let result: TransactionResult;
        if (wethBalance.gt(new BN(0))) {
          result = await retryTransaction(unwrapTransaction, [
            web3,
            wethContract,
            account,
            txRound,
            accIndex,
            config.gasPriceMultiplier,
          ]);
        } else {
          result = await retryTransaction(wrapTransaction, [
            web3,
            wethContract,
            account,
            amountPerTx,
            txRound,
            accIndex,
            config.gasPriceMultiplier,
          ]);
        }

        if (result.status === "success") {
          successfulTransactions++;
        }

        completedTransactions++;

        const progressPercent = Math.round(
          (completedTransactions / totalTransactions) * 100
        );
        console.log(
          kleur.gray(
            `   📊 Overall Progress: ${completedTransactions}/${totalTransactions} (${progressPercent}%)`
          )
        );
      } catch (error: any) {
        completedTransactions++;
        console.error(
          kleur.red(
            `   ❌ Final error for account ${account.address}: ${error.message}`
          )
        );
      }

      if (
        txRound !== config.totalTx - 1 ||
        accIndex !== accountsAuth.length - 1
      ) {
        await delayWithProgress(
          config.delayMinutes * 60 * 1000,
          `Waiting ${config.delayMinutes} minutes before next transaction`
        );
      }
    }
  }

  console.log(kleur.cyan().bold("\n📊 Transaction Summary"));
  console.log("━".repeat(40));
  console.log(
    `${kleur.green(
      "✓ Successful:"
    )} ${successfulTransactions}/${totalTransactions}`
  );
  console.log(
    `${kleur.red("❌ Failed:")} ${
      totalTransactions - successfulTransactions
    }/${totalTransactions}`
  );
  console.log(
    `${kleur.blue("📈 Success Rate:")} ${Math.round(
      (successfulTransactions / totalTransactions) * 100
    )}%`
  );

  if (config.autoSendEnabled) {
    await performAutoSendEth(web3, accountsAuth, config);
    await delay(1000);
  }
}

async function performDailyCheckin(accountsAuth: AccountAuth[]): Promise<void> {
  console.log(kleur.cyan().bold("\n📅 Starting Daily Check-in Process"));
  console.log("━".repeat(50));

  const results: CheckinResult[] = [];

  for (let i = 0; i < accountsAuth.length; i++) {
    const accountAuth = accountsAuth[i];

    console.log(
      kleur.blue(`\n🔐 Checking in Account ${i + 1}/${accountsAuth.length}`)
    );
    console.log(kleur.gray(`   Address: ${accountAuth.address}`));

    if (!accountAuth.jwtToken) {
      console.log(
        kleur.yellow(`   ⚠️ Skipping - No authentication token available`)
      );
      results.push({
        address: accountAuth.address,
        status: "failed",
        error: "No authentication token",
      });
      continue;
    }

    try {
      const response = await fetch(
        `${PHAROS_CONFIG.API_BASE_URL}/sign/in?address=${accountAuth.address}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accountAuth.jwtToken}`,
            Referer: PHAROS_CONFIG.TESTNET_URL,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseJson = await response.json();

      if (responseJson.code === 1) {
        throw new Error(responseJson.message || "Check-in failed");
      }

      console.log(kleur.green(`   ✓ Check-in successful`));
      console.log(
        kleur.gray(`   📄 Response: ${JSON.stringify(responseJson)}`)
      );

      results.push({
        address: accountAuth.address,
        status: "success",
      });
    } catch (error: any) {
      console.error(kleur.red(`   ❌ Check-in failed: ${error.message}`));
      results.push({
        address: accountAuth.address,
        status: "failed",
        error: error.message,
      });
    }

    if (i < accountsAuth.length - 1) {
      await delay(2000);
    }
  }

  const successful = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "failed").length;

  console.log(kleur.cyan().bold("\n📊 Check-in Summary"));
  console.log("━".repeat(30));
  console.log(`${kleur.green("✓ Successful:")} ${successful} accounts`);

  if (failed > 0) {
    console.log(`${kleur.red("❌ Failed:")} ${failed} accounts`);

    const failedResults = results.filter((r) => r.status === "failed");
    failedResults.forEach((result, index) => {
      console.log(
        kleur.red(`   ${index + 1}. ${result.address}: ${result.error}`)
      );
    });
  }

  console.log(
    `${kleur.blue("📈 Success Rate:")} ${Math.round(
      (successful / results.length) * 100
    )}%`
  );
}

async function wrapUnwrapLoop(config: AppConfig): Promise<void> {
  displayConfiguration(config);

  const web3 = new Web3(config.rpc);
  const accounts = config.privateKeys.map((pk) => {
    const account = web3.eth.accounts.privateKeyToAccount("0x" + pk);
    web3.eth.accounts.wallet.add(account);
    return account;
  });

  await displayAccountsInfo(web3, accounts);

  const accountsAuth = await authenticateAccounts(web3, accounts);
  const wethContract = new web3.eth.Contract(abi, config.wethAddress);

  if (config.mode === "auto") {
    console.log(kleur.yellow().bold("🤖 Auto Mode - Running on schedule"));

    while (true) {
      const delayUntilNextRun = calculateDelayUntilNextRun(
        config.runHour!,
        config.runMinute!
      );

      const nextRunTime = new Date(Date.now() + delayUntilNextRun);
      console.log(
        kleur.blue(`\n⏰ Next scheduled run: ${nextRunTime.toLocaleString()}`)
      );

      countdown(delayUntilNextRun);
      await delay(delayUntilNextRun);

      await performDailyCheckin(accountsAuth);
      await runTransactions(web3, wethContract, accountsAuth, config);

      console.log(
        kleur.green().bold("\n🎉 Daily cycle completed successfully!")
      );
      console.log(kleur.gray("Waiting for next scheduled run..."));
    }
  } else {
    console.log(kleur.yellow().bold("👤 Manual Mode - Running once"));
    await performDailyCheckin(accountsAuth);
    await runTransactions(web3, wethContract, accountsAuth, config);
    console.log(kleur.green().bold("\n🎉 Manual execution completed!"));
  }
}

async function main(): Promise<void> {
  try {
    displayHeader();

    if (!process.env.PRIVATE_KEYS) {
      throw new Error(
        "❌ PRIVATE_KEYS environment variable not found. Please configure it in .env file"
      );
    }

    const privateKeys = process.env.PRIVATE_KEYS.split(",").map((key) =>
      key.trim()
    );

    if (privateKeys.length === 0) {
      throw new Error(
        "❌ No private keys found. Please check your .env configuration"
      );
    }

    console.log(
      kleur.green(
        `✓ Loaded ${privateKeys.length} private key(s) from environment`
      )
    );

    const config = loadConfiguration(privateKeys);
    await wrapUnwrapLoop(config);
  } catch (error: any) {
    console.error(kleur.red().bold("\n💥 Fatal Error:"), error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(kleur.red().bold("Unhandled error:"), error);
  process.exit(1);
});
