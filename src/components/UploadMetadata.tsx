import { FC, useState, Fragment, useEffect, useRef } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, SelectorIcon } from "@heroicons/react/solid";
import { WebBundlr } from "@bundlr-network/client";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

import { notify } from "../utils/notifications";

const bundlers = [
  { id: 1, network: "mainnet-beta", name: "https://node1.bundlr.network" },
  { id: 2, network: "devnet", name: "https://devnet.bundlr.network" },
];

const classNames = (...classes) => {
  return classes.filter(Boolean).join(" ");
};

export const UploadMetadata: FC = ({}) => {
  const wallet = useWallet();
  const fileInputRef = useRef(null);
  const [provider, setProvider] = useState(null);
  const [address, setAddress] = useState(null);
  const [bundlr, setBundlr] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageReplace, setSelectedImageReplace] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageFileReplace, setImageFileReplace] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageUrlReplace, setImageUrlReplace] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [metadataUrl, setMetadataUrl] = useState(null);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [webSite, setWebSite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [discord, setDiscord] = useState("");

  useEffect(() => {
    if (wallet && wallet.connected) {
      async function connectProvider() {
        await wallet.connect();
        const provider = wallet.wallet.adapter;
        await provider.connect();
        setProvider(provider);
      }
      connectProvider();
    }
  });

  useEffect(() => {});

  const initializeBundlr = async () => {
    // initialise a bundlr client
    let bundler;
    if (selected === null) {
      notify({ type: "error", message: `Please select network` });
      return;
    } else if (selected.name === "https://devnet.bundlr.network") {
      bundler = new WebBundlr(`${selected.name}`, "solana", provider, {
        providerUrl: "https://api.devnet.solana.com",
      });
    } else {
      bundler = new WebBundlr(`${selected.name}`, "solana", provider);
    }

    try {
      // Check for valid bundlr node
      await bundler.utils.getBundlerAddress("solana");
    } catch (err) {
      notify({ type: "error", message: `${err}` });
      return;
    }
    try {
      await bundler.ready();
    } catch (err) {
      notify({ type: "error", message: `${err}` });
      return;
    } //@ts-ignore
    if (!bundler.address) {
      notify({
        type: "error",
        message: "Unexpected error: bundlr address not found",
      });
    }
    notify({
      type: "success",
      message: `Connected to ${selected.network}`,
    });
    setAddress(bundler?.address);
    setBundlr(bundler);
  };

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file.name);
      if (imageUrl) {
        setSelectedImageReplace(file.name);
        setImageFileReplace(file);
      } else {
        setImageFile(file);
      }
    }
  };

  const handleMetadataChange = () => {
    if (!imageUrl) {
      notify({
        type: "error",
        message: `Please upload Image!`,
        description: `Please upload Image!`,
      });
      return;
    }
    const metadataTemplate = {
      name: name,
      symbol: symbol,
      description: description,
      seller_fee_basis_points: 0,
      image: imageUrl,
      external_url: webSite,
      website: webSite,
      twitter,
      telegram,
      discord,
      attributes: [
        { trait_type: "web", value: "yes" },
        { trait_type: "mobile", value: "yes" },
        { trait_type: "extension", value: "yes" },
        { trait_type: "twitter", value: twitter },
        { trait_type: "telegram", value: telegram },
        { trait_type: "discord", value: discord },
      ],
      collection: { name, family: "Solflare" },
      properties: {
        files: [{ uri: imageUrl, type: "image/png" }],
        socials: { twitter, discord, website: webSite, telegram },
      },
    };

    const metadataString = JSON.stringify(metadataTemplate);
    const metadataBuffer = Buffer.from(metadataString);
    setMetadata(metadataBuffer);
    return metadataBuffer;
  };

  const uploadImage = async () => {
    let fileToUpload = imageFile;
    if (imageFileReplace) {
      fileToUpload = imageFileReplace;
    }

    if (!fileToUpload) return;

    const arrayBuffer = await fileToUpload.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const price = await bundlr.utils.getPrice("solana", buffer.length);
    let amount = bundlr.utils.unitConverter(price);
    amount = amount.toNumber();

    const loadedBalance = await bundlr.getLoadedBalance();
    let balance = bundlr.utils.unitConverter(loadedBalance.toNumber());
    balance = balance.toNumber();

    // Add a buffer to the funding amount (e.g., 0.2 SOL) and convert to integer
    const fundingBuffer = LAMPORTS_PER_SOL * 0.2;
    const totalFundingAmount = Math.ceil(amount + fundingBuffer);

    if (balance < totalFundingAmount) {
      await bundlr.fund(totalFundingAmount);
      balance = bundlr.utils.unitConverter(
        (await bundlr.getLoadedBalance()).toNumber()
      );
      balance = balance.toNumber();
    }

    if (balance < amount) {
      notify({
        type: "error",
        message:
          "Insufficient balance after funding. Please ensure your wallet has enough SOL.",
      });
      return;
    }

    const imageResult = await bundlr.uploader.upload(buffer, [
      { name: "Content-Type", value: "image/png" },
    ]);

    const arweaveImageUrl = `https://arweave.net/${imageResult.data.id}?ext=png`;

    if (arweaveImageUrl) {
      setImageUrl(arweaveImageUrl);
      setImageFile(null);
      setImageFileReplace(null);
      setSelectedImageReplace(null);
    }
  };

  const uploadMetadata = async () => {
    const metadataForm = await handleMetadataChange();
    const price = await bundlr.utils.getPrice("solana", metadataForm.length);
    let amount = bundlr.utils.unitConverter(price);
    amount = amount.toNumber();

    const loadedBalance = await bundlr.getLoadedBalance();
    let balance = bundlr.utils.unitConverter(loadedBalance.toNumber());
    balance = balance.toNumber();

    if (balance < amount) {
      await bundlr.fund(LAMPORTS_PER_SOL);
    }

    const metadataResult = await bundlr.uploader.upload(metadataForm, [
      { name: "Content-Type", value: "application/json" },
    ]);
    const arweaveMetadataUrl = `https://arweave.net/${metadataResult.data.id}`;

    setMetadataUrl(arweaveMetadataUrl);
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <div className="flex items-center md:col-span-1">
            <div className="px-4 sm:px-0">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Bundler
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                This is the bundler you will be using to upload your files to
                Arweave.
              </p>
            </div>
          </div>
          <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1">
            <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
              <Listbox value={selected} onChange={setSelected}>
                {() => (
                  <>
                    <div className="mt-1 relative">
                      <Listbox.Button className="bg-white relative w-full border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                        <span className="block truncate">
                          {!selected ? "Select Network" : selected.network}
                        </span>
                        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <SelectorIcon
                            className="h-5 w-5 text-gray-400"
                            aria-hidden="true"
                          />
                        </span>
                      </Listbox.Button>

                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                          {bundlers.map((bundler) => (
                            <Listbox.Option
                              key={bundler.id}
                              className={({ active }) =>
                                classNames(
                                  active
                                    ? "text-white bg-purple-500"
                                    : "text-gray-900",
                                  "cursor-default select-none relative py-2 pl-3 pr-9"
                                )
                              }
                              value={bundler}
                            >
                              {({ selected, active }) => (
                                <>
                                  <span
                                    className={classNames(
                                      selected
                                        ? "font-semibold"
                                        : "font-normal",
                                      "block truncate"
                                    )}
                                  >
                                    {bundler.network}
                                  </span>

                                  {selected ? (
                                    <span
                                      className={classNames(
                                        active
                                          ? "text-white"
                                          : "text-purple-500",
                                        "absolute inset-y-0 right-0 flex items-center pr-4"
                                      )}
                                    >
                                      <CheckIcon
                                        className="h-5 w-5"
                                        aria-hidden="true"
                                      />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </>
                )}
              </Listbox>
            </div>
          </div>
          <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1">
            <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
              <button
                className="items-center px-3 py-2 text-xs btn bg-[#18a2b4] hover:from-pink-500 hover:to-yellow-500 ..."
                onClick={async () => await initializeBundlr()}
              >
                Connect
              </button>
            </div>
          </div>
        </div>
        <div className="hidden sm:block" aria-hidden="true">
          <div className="py-5">
            <div className="border-t border-gray-200" />
          </div>
        </div>
        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <div className="flex flex-col items-center justify-center md:col-span-1">
            <div className="px-4 sm:px-0">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Image URL
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                The Arweave URL for your stored image. Set this as the{" "}
                <code className="text-[#18a2b4]">image</code> and{" "}
                <code className="text-[#18a2b4]">uri</code> values in your
                metadata file.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1">
            {!imageUrl ? (
              <div className="mt-1 sm:mt-0 sm:col-span-1">
                <div className="max-w-lg flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  {imageUrl && (
                    <div>
                      <img
                        src={imageUrl}
                        alt="Uploaded"
                        className="w-[100px] mh-[100px] cursor-pointer"
                      />
                      <p>{selectedImage}</p>
                    </div>
                  )}
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="image-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-[#18a2b4] hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                      >
                        <span>Upload an image</span>
                        <input
                          id="image-upload"
                          name="image-upload"
                          ref={fileInputRef}
                          type="file"
                          className="sr-only"
                          onChange={handleImageChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    {!selectedImage ? null : (
                      <p className="text-sm text-gray-500">{selectedImage}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="max-w-lg flex gap-[5px] items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md"
                onClick={handleImageClick}
              >
                {imageUrl && (
                  <div>
                    <img
                      src={imageUrl}
                      alt="Uploaded"
                      className="w-[100px] mh-[100px] cursor-pointer"
                    />
                    <p>{selectedImage}</p>
                  </div>
                )}
                {imageFile && !imageUrl && (
                  <div>
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="New Upload"
                      className="w-[100px] mh-[100px] cursor-pointer"
                    />
                    <p>{selectedImage}</p>
                  </div>
                )}
                {imageFileReplace && imageUrl && (
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3"
                      />
                    </svg>
                    <div>
                      <img
                        src={URL.createObjectURL(imageFileReplace)}
                        alt="Replace"
                        className="w-[100px] mh-[100px] cursor-pointer"
                      />
                      <p>{selectedImageReplace}</p>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            )}
          </div>
          <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1">
            <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
              {
                <button
                  className="px-8 m-2 btn bg-[#18a2b4] ..."
                  onClick={async () => uploadImage()}
                  disabled={!bundlr}
                >
                  Upload Image
                </button>
              }
            </div>
          </div>
        </div>
        <div className="hidden sm:block" aria-hidden="true">
          <div className="py-5">
            <div className="border-t border-gray-200" />
          </div>
        </div>
        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <div className="flex items-center md:col-span-1">
            <div className="px-4 sm:px-0">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Metadata URL
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                The Arweave URL where your metadata is saved. You will use this
                to create your token.
              </p>
            </div>
          </div>
          <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1">
            {!metadataUrl ? (
              <div className="mt-1 sm:mt-0 sm:col-span-1">
                <div className="max-w-lg flex justify-center px-6 pt-5 pb-6 ">
                  <div className="space-y-1 text-center">
                    {!metadataUrl && (
                      <div className="flex flex-col">
                        <div className="flex flex-col flex-1 items-start">
                          <input
                            type="text"
                            className="mt-[10px] form-control block mb-2 w-full h-[52px] px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-[3px] border-[#bbe3e9] rounded-[12px] transition ease-in-out m-0 focus:text-gray-700 focus:bg-white  focus:outline-none"
                            placeholder="Name"
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col flex-1 items-start">
                          <input
                            type="text"
                            className="mt-[10px] form-control block mb-2 w-full h-[52px] px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-[3px] border-[#bbe3e9] rounded-[12px] transition ease-in-out m-0 focus:text-gray-700 focus:bg-white  focus:outline-none"
                            placeholder="Symbol"
                            onChange={(e) => setSymbol(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col flex-1 items-start">
                          <textarea
                            className="mt-[10px] form-control block mb-2 w-full min-w-[400px] px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-[3px] border-[#bbe3e9] rounded-[12px] transition ease-in-out m-0 focus:text-gray-700 focus:bg-white  focus:outline-none h-[100%]"
                            placeholder="Description"
                            onChange={(e) => setDescription(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col flex-1 items-start">
                          <input
                            type="text"
                            className="mt-[10px] form-control block mb-2 w-full h-[52px] px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-[3px] border-[#bbe3e9] rounded-[12px] transition ease-in-out m-0 focus:text-gray-700 focus:bg-white  focus:outline-none"
                            placeholder="Website"
                            onChange={(e) => setWebSite(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col flex-1 items-start">
                          <input
                            type="text"
                            className="mt-[10px] form-control block mb-2 w-full h-[52px] px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-[3px] border-[#bbe3e9] rounded-[12px] transition ease-in-out m-0 focus:text-gray-700 focus:bg-white  focus:outline-none"
                            placeholder="Twitter"
                            onChange={(e) => setTwitter(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col flex-1 items-start">
                          <input
                            type="text"
                            className="mt-[10px] form-control block mb-2 w-full h-[52px] px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-[3px] border-[#bbe3e9] rounded-[12px] transition ease-in-out m-0 focus:text-gray-700 focus:bg-white  focus:outline-none"
                            placeholder="Telegram"
                            onChange={(e) => setTelegram(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col flex-1 items-start">
                          <input
                            type="text"
                            className="mt-[10px] form-control block mb-2 w-full h-[52px] px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-[3px] border-[#bbe3e9] rounded-[12px] transition ease-in-out m-0 focus:text-gray-700 focus:bg-white  focus:outline-none"
                            placeholder="Discord"
                            onChange={(e) => setDiscord(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    {!selectedFile ? null : (
                      <p className="text-sm text-gray-500">{selectedFile}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                <a href={metadataUrl} target="_blank" rel="noreferrer">
                  {metadataUrl}
                </a>
              </div>
            )}
          </div>
          <div className="flex items-center justify-center mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1">
            <div className="flex flex-col px-4 py-5 bg-white space-y-6 sm:p-6">
              {!metadataUrl && (
                <button
                  className="items-center px-3 py-2 text-xs btn bg-[#18a2b4] hover:from-pink-500 hover:to-yellow-500 ..."
                  onClick={async () => uploadMetadata()}
                  disabled={!bundlr}
                >
                  Upload Metadata
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
