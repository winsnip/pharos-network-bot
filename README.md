# Pharos Bot Configuration Tutorial (AUTO SWAP + AUTO SEND + DAILY CHECK-IN)

## Overview
This guide will help you configure and run the Pharos bot in both auto and manual modes. The bot supports automated transactions with customizable parameters.

## Prerequisites
- Node.js installed on your system
- npm package manager
- Screen utility (for Linux/Unix systems)

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/winsnip/pharos-network-bot.git
   cd pharos-network-bot
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Private Key(without 0x)**
   ```bash
   echo PRIVATE_KEYS=pk1,pk2,pk3,etc > .env
   ```
   > Replace `pk1,pk2....` with your actual private key

## Configuration Setup

When you run the bot, you'll be prompted to configure the following parameters:

### 1. Bot Mode Selection
```
Enter SWAP mode (auto/manual): manual
```
- Choose `auto` for automated operation with scheduled runs
- Choose `manual` for manual control with immediate execution

### 2. Transaction Configuration
```
Total SWAP transactions per account: 10
```
- Set the number of SWAP transactions each account will perform
- Example: `10` means each account will execute 10 SWAP transactions

### 3. Transaction Timing
```
Delay between SWAP transactions (minutes): 0.05
```
- Set the delay between each SWAP transaction in minutes
- Example: `0.05` = 3 seconds delay between transactions
- Minimum recommended: `0.05` minutes

### 4. Gas Price Configuration
```
Gas price multiplier for SWAP (e.g., 1.2 for 120%): 1.3
```
- Set gas price multiplier to ensure transaction confirmation
- Example: `1.3` = 130% of estimated gas price
- Recommended range: `1.1` to `1.5`

### 5. ETH Amount Configuration
```
Enter ETH amounts for wrap/unwrap per account:
Account 1 amount (ETH): 0.001
Account 2 amount (ETH): 0.001
```
- Set the ETH amount for wrap/unwrap operations for each account
- Example: `0.001` ETH per account
- Ensure sufficient balance for both operations and gas fees

### 6. Auto Send ETH Feature
```
Auto Send ETH Feature Configuration:
Enable Auto Send ETH? (y/n): y
ETH amount to send per transaction: 0.00001
Number of random target addresses: 5
```
- **Enable Auto Send ETH**: Choose `y` to enable or `n` to disable
- **ETH amount per transaction**: Amount to send in each auto-send transaction
- **Number of target addresses**: How many random addresses to send ETH to
- This feature adds additional transaction variety to your bot operations

### 7. Schedule Configuration (Auto Mode Only)
```
Enter hour to run bot (0-23): 23
Enter minute to run bot (0-59): 59
```
- **Only appears in AUTO mode**
- Set the time when the bot should start running
- Uses 24-hour format
- Example: `23:59` = 11:59 PM

## Running the Bot

### Manual Mode (Immediate Execution)
1. **Start the bot**:
```bash
npm run start
```

2. **Follow the configuration prompts**:
   - Select `manual` when asked for SWAP mode
   - Configure all transaction parameters
   - Bot will start executing immediately after configuration
   - No schedule configuration needed

3. **Monitor execution**:
   - Bot will execute all configured transactions immediately
   - Monitor the terminal for transaction status and confirmations

### Auto Mode (Scheduled Execution)
1. **Create a screen session** (recommended for persistent running):
```bash
screen -R pharos
```

2. **Start the bot**:
```bash
npm run start
```

3. **Configure and schedule**:
   - Select `auto` when asked for SWAP mode
   - Configure all transaction parameters
   - Set schedule time (hour and minute)
   - Bot will wait until scheduled time to execute

4. **Detach from screen** (optional - to keep bot running in background):
   - Press `Ctrl + A`, then `D`

5. **Reattach to screen** (to check bot status):
```bash
screen -r pharos
```

## Configuration Examples

### Manual Mode Configuration Example
```
SWAP mode: manual
Total SWAP transactions per account: 10
Delay between SWAP transactions: 0.05 minutes
Gas price multiplier: 1.3x
Account 1 ETH amount: 0.001
Account 2 ETH amount: 0.001
Auto Send ETH: Enabled
ETH amount per auto-send: 0.00001
Random target addresses: 5
Execution: Immediate
```

### Auto Mode Configuration Example
```
SWAP mode: auto
Total SWAP transactions per account: 15
Delay between SWAP transactions: 0.1 minutes
Gas price multiplier: 1.2x
Account ETH amounts: 0.001 each
Auto Send ETH: Enabled
ETH amount per auto-send: 0.00001
Random target addresses: 3
Schedule: 23:59 (11:59 PM)
```

## Key Differences Between Modes

| Feature            | Manual Mode                   | Auto Mode                  |
| ------------------ | ----------------------------- | -------------------------- |
| Execution          | Immediate after configuration | Scheduled execution        |
| Schedule Setup     | Not required                  | Required (hour + minute)   |
| Background Running | Direct terminal execution     | Recommended with screen    |
| Use Case           | Immediate testing/execution   | Scheduled daily operations |

## Important Notes

⚠️ **Safety Considerations:**
- **NEVER share your private key with anyone**
- Always test with small amounts first
- Ensure you have sufficient ETH for gas fees and all operations
- Monitor the bot during initial runs
- Keep your private keys secure and never commit .env file to git

💡 **Tips:**
- **Manual mode**: Perfect for immediate testing and one-time runs
- **Auto mode**: Ideal for daily scheduled operations using screen sessions
- Set reasonable delays to avoid being rate-limited
- Monitor gas prices and adjust multiplier accordingly
- Auto Send ETH feature adds transaction diversity but uses additional gas

## Troubleshooting

### Common Issues:
1. **Insufficient funds**: Ensure accounts have enough ETH for all operations (SWAP + Auto Send + gas)
2. **High gas prices**: Increase gas price multiplier if transactions are failing
3. **Rate limiting**: Increase delay between transactions
4. **Network issues**: Check internet connection and RPC endpoint
5. **Auto Send ETH failures**: Ensure sufficient balance for both main operations and auto-send amounts

### Log Files:
Check the bot's log files for detailed error messages and transaction status.

## Support

If you encounter issues:
1. Check the configuration values
2. Review log files for error messages
3. Ensure network connectivity
4. Verify account balances for all operations

---

**Remember to always run tests with small amounts before using significant funds!**

## Node.js Cleanup & Reinstallation
```bash
sudo apt remove --purge nodejs npm libnode-dev -y
sudo apt autoremove -y
sudo rm -rf /usr/include/node /usr/lib/node_modules ~/.npm ~/.nvm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

**Kopi**: https://trakteer.id/Winsnipsupport/tip

### **Join Telegram Winsnip**

Stay updated and connect with the Winsnip community:

Channel: https://t.me/winsnip

Group Chat: https://t.me/winsnip_chat

This ensures users can join the Telegram community easily and stay engaged with updates and discussions.