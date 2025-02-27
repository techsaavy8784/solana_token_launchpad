import { FC, useState, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Metadata, PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { notify } from "utils/notifications";

export const GetMetadata: FC = () => {
  const { connection } = useConnection();
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenMetadata, setTokenMetadata] = useState(null);
  const [logo, setLogo] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const getMetadata = useCallback(
    async (form) => {
      try {
        setLogo(null);
        const tokenMint = new PublicKey(form.tokenAddress);
        const metadataPDA = PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            PROGRAM_ID.toBuffer(),
            tokenMint.toBuffer(),
          ],
          PROGRAM_ID
        )[0];
        const metadataAccount = await connection.getAccountInfo(metadataPDA);
        const [metadata, _] = await Metadata.deserialize(metadataAccount.data);
        if (
          metadata.data.uri?.length != 0 &&
          metadata.data.uri[0] != "\u0000"
        ) {
          let logoRes = await fetch(metadata.data.uri);
          let logoJson = await logoRes.json();
          let { image } = logoJson;
          setLogo(image);
        }

        setTokenMetadata({ tokenMetadata, ...metadata.data });
        setLoaded(true);
        setTokenAddress("");
      } catch (err) {
        notify({ type: "error", message: `Please input valid token address` });
      }
    },
    [tokenAddress]
  );

  const mytrim = (str: any) => {
    if (!str) return null;
    let i = 0;
    while (str[i] && str[i] != "\u0000") i++;
    return String(str).slice(0, i);
  };

  return (
    <>
      <div className="my-6">
        <input
          type="text"
          value={tokenAddress}
          className="form-control min-w-[400px] block mb-2 ml-auto mr-auto max-w-800 px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
          placeholder="Token Address"
          onChange={(e) => setTokenAddress(e.target.value)}
        />
        <button
          className="px-8 m-2 btn bg-[#18a2b4] hover:from-pink-500 hover:to-yellow-500 ..."
          onClick={() => getMetadata({ tokenAddress })}
        >
          <span>Get Metadata</span>
        </button>
      </div>
      <div className="my-6 min-w-[400px]">
        {!loaded ? undefined : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Token Metadata
              </h3>
            </div>
            <div className="border-t border-gray-200">
              <dl className="divide-y divide-gray-200">
                <>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">logo</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <img
                        src={logo}
                        alt="token"
                        className="w-1/4 h-full inline-block object-center object-cover lg:w-1/4 lg:h-full"
                      />
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">name</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {mytrim(tokenMetadata?.name)}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">
                      symbol
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {mytrim(tokenMetadata?.symbol) || "undefined"}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">uri</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <a
                        href={mytrim(tokenMetadata?.uri)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {mytrim(tokenMetadata?.uri)}
                      </a>
                    </dd>
                  </div>
                </>
              </dl>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
