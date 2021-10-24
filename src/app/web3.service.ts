declare let window: any;

export class Web3Service {

  web3BuildSuccess: boolean = false;
  web3 = window.web3;
  userAccount: string = "";

  constructor() {
    if (this.web3 != null) {
      window.ethereum.on('accountsChanged', (accList: string[]) => {
        this.userAccount = this.web3.utils.toChecksumAddress(accList[0]);
        console.log("User Account Changed to : " + this.userAccount);
      });

      window.ethereum.request({method: 'eth_requestAccounts'}).then(() => {
        this.web3BuildSuccess = true;
      }).catch((err: any) => {
        console.log("Web3 Access Denied : " + err);
      });
    } else {
      this.web3BuildSuccess = false;
    }
  }
}
