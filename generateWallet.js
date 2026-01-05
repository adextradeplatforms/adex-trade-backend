import { Wallet } from 'ethers';

const wallet = Wallet.createRandom();

console.log('====================================');
console.log('PLATFORM WALLET CREATED');
console.log('====================================');
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('====================================');
