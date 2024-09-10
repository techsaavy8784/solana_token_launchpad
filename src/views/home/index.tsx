// Next, React
import { FC, useEffect } from "react";

// Wallet
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

// Components
import { RequestAirdrop } from "../../components/RequestAirdrop";

// Store
import useUserSOLBalanceStore from "../../stores/useUserSOLBalanceStore";
import { CreateToken } from "components/CreateToken";

export const HomeView: FC = ({}) => {
  const wallet = useWallet();
  const { connection } = useConnection();

  const balance = useUserSOLBalanceStore((s) => s.balance);
  const { getUserSOLBalance } = useUserSOLBalanceStore();

  useEffect(() => {
    if (wallet.publicKey) {
      getUserSOLBalance(wallet.publicKey, connection);
    }
  }, [wallet.publicKey, connection, getUserSOLBalance]);

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text text-purple-800">
          Token Creator
        </h1>
        <div className="text-center">
          <RequestAirdrop my-2 />
          {wallet && (
            <p className="text-[#18a2b4]">
              SOL Balance: {(balance || 0).toLocaleString()}
            </p>
          )}
          <CreateToken />
        </div>
      </div>
    </div>
  );
};
