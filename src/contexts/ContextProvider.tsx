import { WalletAdapterNetwork, WalletError } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider as ReactUIWalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  SolletExtensionWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AutoConnectProvider, useAutoConnect } from "./AutoConnectProvider";
import { notify } from "../utils/notifications";

const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { autoConnect } = useAutoConnect();
  const [networkDrop, setNetworkDrop] = useState("devnet");

  const [network, setNetwork] = useState(WalletAdapterNetwork.Devnet);
  const setURL = (network: WalletAdapterNetwork) => {
    if (network === WalletAdapterNetwork.Mainnet)
      return "https://prettiest-alpha-layer.solana-mainnet.quiknode.pro/299c8791dd626fb1352a0fd06e92afe2b95aa3cc";
    return clusterApiUrl(network);
  };
  const endpoint = useMemo(() => setURL(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new SolletWalletAdapter({ network }),
      new SolletExtensionWalletAdapter({ network }),
      new TorusWalletAdapter(),
    ],
    [network]
  );

  const onError = useCallback((error: WalletError) => {
    notify({
      type: "error",
      message: error.message ? `${error.name}: ${error.message}` : error.name,
    });
  }, []);

  useEffect(() => {
    if (networkDrop == "devnet") {
      setNetwork(WalletAdapterNetwork.Devnet);
    }
    if (networkDrop == "testnet") {
      setNetwork(WalletAdapterNetwork.Testnet);
    }
    if (networkDrop == "mainnet-beta") {
      setNetwork(WalletAdapterNetwork.Mainnet);
    }
  }, [networkDrop]);
  return (
    // TODO: updates needed for updating and referencing endpoint: wallet adapter rework
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        onError={onError}
        autoConnect={autoConnect}
      >
        <ReactUIWalletModalProvider>
          <div className="absolute top-[70px] right-[0px] z-[10] justify-center flex items-center">
            <select
              value={networkDrop}
              className="bg-[#18a2b4] font-[Inter] border-0 font-bold p-2 text-xl rounded"
              onChange={(e) => setNetworkDrop(e.target.value)}
            >
              <option
                value="devnet"
                className="py-4 block text-md font-normal bg-[#18a2b4]"
              >
                Devnet
              </option>
              <option
                value="testnet"
                className="py-4 block text-md font-normal bg-[#18a2b4]"
              >
                Testnet
              </option>
              <option
                value="mainnet-beta"
                className="py-4 block text-md font-normal bg-[#18a2b4]"
              >
                Mainnet-beta
              </option>
            </select>
          </div>
          {children}
        </ReactUIWalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export const ContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AutoConnectProvider>
      <WalletContextProvider>{children}</WalletContextProvider>
    </AutoConnectProvider>
  );
};
