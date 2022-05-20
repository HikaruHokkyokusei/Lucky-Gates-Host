import {AppComponent} from "../app.component";
import type {default as W} from "web3";

declare let Web3: any;

export class Web3Service {
  web3BuildSuccess: boolean = false;
  didSignMessage: boolean = false;
  web3: W | null = null;
  userAccount: string = "";
  chainId: number = 0;

  constructor(private appComponent: AppComponent) {
    this.startWeb3BuildingProcess("Metamask");
  }

  startWeb3BuildingProcess = (web3ProviderName: any) => {
    if (web3ProviderName === "Metamask") {
      this.initializeWeb3FromMetamask();
    } else if (web3ProviderName === "WalletConnect") {
      this.initializeWeb3FromWalletConnect();
    } else {
      // TODO : Work on this...
      //  create custom pop up to ask whether metamask or walletConnect
      window.alert("Please connect your wallet.");
    }
  };

  private initializeWeb3FromMetamask = () => {
    if (window.ethereum) {
      this.web3 = new Web3(window.ethereum);
    } else {
      this.web3 = null;
    }
    if (this.web3 != null) {
      window.ethereum.on('accountsChanged', this.setUserAccount);

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      window.ethereum.request({method: 'eth_chainId'}).then((chainId: any) => {
        this.chainId = +chainId;
      }).catch((err: any) => {
        console.log("Unable to get chainId.\nErr:");
        console.log(err);
      });

      window.ethereum.request({method: 'eth_requestAccounts'}).then((accList: string[]) => {
        this.setUserAccount(accList);
        if (this.userAccount !== "") {
          this.web3BuildSuccess = true;
          console.log("Successfully Connected to Web3 Service");
        }
      }).catch((err: any) => {
        console.log("Web3 Access Denied :");
        console.log(err);
      });
    } else {
      this.web3BuildSuccess = false;
    }
  };

  private initializeWeb3FromWalletConnect = () => {
    // TODO : Work on this...
  };

  private setUserAccount = (accList: string[]) => {
    if (accList != null && accList.length > 0) {
      let userAccount: string = this.web3!.utils.toChecksumAddress(accList[0]);
      if (this.userAccount !== userAccount) {
        this.userAccount = userAccount;
        this.web3BuildSuccess = true;
        this.appComponent.bindPlayerAddress();
        console.log("User Account Changed to : " + this.userAccount);
      }
    }
  };

  requestSignatureFromUser = async (messageToSign: string) => {
    if (this.web3BuildSuccess) {
      try {
        let signedMessage = await this.web3!.eth.personal.sign(messageToSign, this.userAccount, "Unnecessary Dummy Parameter");
        this.didSignMessage = true;
        return signedMessage;
      } catch (err) {
        this.didSignMessage = false;
        this.appComponent.popUpManagerService.popNewPopUp("User Denied Signature. Reload the page and try again.");
      }
    } else {
      this.didSignMessage = false;
    }
    return "";
  }
}
