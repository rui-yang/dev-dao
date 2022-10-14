import Head from 'next/head';
import styles from '../styles/Home.module.css';
import Web3Modal from 'web3modal';
import { useState, useRef, useEffect } from 'react';
import { providers, Contract, utils } from 'ethers';
import {
    CRYPTODEVS_NFT_CONTRACT_ADDRESS,
    CRYPTODEVS_NFT_ABI,
    CRYPTODEVS_DAO_CONTRACT_ADDRESS,
    CRYPTODEVS_DAO_ABI,
} from '../constants';

export default function Home() {
    const [walletConnected, setWalletConnected] = useState(false);
    const [nftBalance, setNftBalance] = useState('0');
    const [treasuryBalance, setTreasuryBalance] = useState('0');
    const [numOfProposals, setNumOfProposals] = useState('0');
    const [fakeTokenId, setFakeTokenId] = useState('');
    const [selectedTab, setSelectedTab] = useState('');
    const [loading, setLoading] = useState(false);
    const [proposals, setProposals] = useState([]);
    const web3modal = useRef();

    const getProviderOrSigner = async (needSigner = false) => {
        const provider = await web3modal.current.connect();
        const web3Provider = new providers.Web3Provider(provider);

        const { chainId } = await web3Provider.getNetwork();
        if (chainId !== 5) {
            console.log('Please change network to Goerli');
            throw new Error('Change network to Goerli');
        }

        if (needSigner) {
            const signer = await web3Provider.getSigner();
            return signer;
        }

        return web3Provider;
    };

    const connectWallet = async () => {
        try {
            await getProviderOrSigner();
            setWalletConnected(true);
        } catch (error) {
            console.log(error);
            setWalletConnected(false);
        }
    };

    const getNFTBalance = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const nftContract = new Contract(
                CRYPTODEVS_NFT_CONTRACT_ADDRESS,
                CRYPTODEVS_NFT_ABI,
                signer
            );
            const address = await signer.getAddress();

            const balance = await nftContract.balanceOf(address);
            setNftBalance(balance.toString());
        } catch (error) {
            console.log(error);
        }
    };

    const getTreasuryBalance = async () => {
        try {
            const provider = await getProviderOrSigner();
            const balance = await provider.getBalance(
                CRYPTODEVS_DAO_CONTRACT_ADDRESS
            );
            console.log(balance.toString());

            setTreasuryBalance(balance.toString());
        } catch (error) {
            console.log(error);
        }
    };

    const getNumOfProposals = async () => {
        try {
            const provider = await getProviderOrSigner();
            const contract = new Contract(
                CRYPTODEVS_DAO_CONTRACT_ADDRESS,
                CRYPTODEVS_DAO_ABI,
                provider
            );

            const numOfProposals = await contract.numProposals();
            setNumOfProposals(numOfProposals.toString());
        } catch (error) {
            console.log(error);
        }
    };

    const createProposal = async () => {
        try {
            const provider = await getProviderOrSigner(true);
            const daoContract = new Contract(
                CRYPTODEVS_DAO_CONTRACT_ADDRESS,
                CRYPTODEVS_DAO_ABI,
                provider
            );
            const tx = await daoContract.createProposal(fakeTokenId);
            setLoading(true);
            await tx.wait();
            await getNumOfProposals();
            setLoading(false);
        } catch (error) {
            console.log(error);
        }
    };

    const voteOnProposal = async (proposalId, _vote) => {
        try {
            const signer = await getProviderOrSigner(true);
            const daoContract = new Contract(
                CRYPTODEVS_DAO_CONTRACT_ADDRESS,
                CRYPTODEVS_DAO_ABI,
                signer
            );
            let vote = _vote === 'YAY' ? 0 : 1;
            const tx = await daoContract.voteOnProposal(proposalId, vote);
            setLoading(true);
            await tx.wait();
            setLoading(false);
            await fetchAllProposals();
        } catch (error) {
            console.log(error);
            window.alert(error);
        }
    };

    const executeProposal = async (proposalId, _vote) => {
        try {
            const signer = await getProviderOrSigner(true);
            const daoContract = new Contract(
                CRYPTODEVS_DAO_CONTRACT_ADDRESS,
                CRYPTODEVS_DAO_ABI,
                signer
            );
            const tx = await daoContract.executeProposal(proposalId);
            setLoading(true);
            await tx.wait();
            setLoading(false);
            await fetchAllProposals();
        } catch (error) {
            console.log(error);
        }
    };

    const renderTabs = () => {
        if (selectedTab === 'Create Proposal') {
            return renderCreateProposalTab();
        } else if (selectedTab === 'View Proposals') {
            return renderViewProposalsTab();
        }
        return null;
    };

    const renderCreateProposalTab = () => {
        if (loading) {
            return (
                <div className={styles.description}>
                    Loading... Waiting for transaction...
                </div>
            );
        } else if (nftBalance === '0') {
            return (
                <div>
                    You do not own any CryptoDevs NFT. <br />
                    <b>You cannot create or vote on proposals</b>
                </div>
            );
        } else {
            return (
                <div className={styles.container}>
                    <label>Fake NFT Token ID to Purchase: </label>
                    <input
                        placeholder='0'
                        type='number'
                        onChange={e => setFakeTokenId(e.target.value)}
                    />
                    <button className={styles.button2} onClick={createProposal}>
                        Create
                    </button>
                </div>
            );
        }
    };

    const fetchProposalById = async id => {
        try {
            const signer = await getProviderOrSigner(true);
            const daoContract = new Contract(
                CRYPTODEVS_DAO_CONTRACT_ADDRESS,
                CRYPTODEVS_DAO_ABI,
                signer
            );

            const proposal = await daoContract.proposals(id);

            const parsedProposed = {
                proposalId: id,
                nftTokenId: proposal.nftTokenId.toString(),
                deadline: new Date(
                    parseInt(proposal.deadline.toString()) * 1000
                ),
                yayVotes: proposal.yayVotes.toString(),
                nayVotes: proposal.nayVotes.toString(),
                executed: proposal.executed,
            };
            console.log(parsedProposed);
            return parsedProposed;
        } catch (error) {
            console.log(error);
        }
    };

    const fetchAllProposals = async () => {
        try {
            const proposals = [];
            for (let i = 0; i < numOfProposals; i++) {
                const proposal = await fetchProposalById(i);
                proposals.push(proposal);
            }
            setProposals(proposals);
            return proposals;
        } catch (error) {
            console.log(error);
        }
    };

    const renderViewProposalsTab = () => {
        if (loading) {
            return (
                <div className={styles.description}>
                    Loading... Waiting for transaction...
                </div>
            );
        } else if (proposals.length === 0) {
            return (
                <div className={styles.description}>
                    No proposals have been created
                </div>
            );
        } else {
            return proposals.map((p, index) => (
                <div key={index} className={styles.proposalCard}>
                    <p>Proposal ID: {p.proposalId}</p>
                    <p>Fake NFT to purchase: {p.nftTokenId}</p>
                    <p>Deadline: {p.deadline.toLocaleString()}</p>
                    <p>Yay Votes: {p.yayVotes}</p>
                    <p>Nay Votes: {p.nayVotes}</p>
                    <p>Executed?: {p.executed.toString()}</p>
                    {p.deadline.getTime() > Date.now() && !p.executed ? (
                        <div className={styles.flex}>
                            <button
                                className={styles.button2}
                                onClick={() =>
                                    voteOnProposal(p.proposalId, 'YAY')
                                }
                            >
                                Vote YAY
                            </button>
                            <button
                                className={styles.button2}
                                onClick={() =>
                                    voteOnProposal(p.proposalId, 'NAY')
                                }
                            >
                                Vote NAY
                            </button>
                        </div>
                    ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                        <div className={styles.flex}>
                            <button
                                className={styles.button2}
                                onClick={() => executeProposal(p.proposalId)}
                            >
                                Execute Proposal{' '}
                                {p.yayVotes > p.nayVotes ? '(YAY)' : '(NAY)'}
                            </button>
                        </div>
                    ) : (
                        <div className={styles.description}>
                            Proposal Executed
                        </div>
                    )}
                </div>
            ));
        }
    };

    useEffect(() => {
        if (!walletConnected) {
            web3modal.current = new Web3Modal({
                network: 'goerli',
                providerOptions: {},
                disableInjectedProvider: false,
            });

            connectWallet().then(() => {
                getNFTBalance();
                getTreasuryBalance();
                getNumOfProposals();
            });
        }
    }, [walletConnected]);

    useEffect(() => {
        if (selectedTab === 'View Proposals') {
            fetchAllProposals();
        }
    }, [selectedTab]);

    return (
        <div>
            <Head>
                <title>CryptoDevs DAO</title>
                <meta name='description' content='CryptoDevs DAO' />
                <link rel='icon' href='/favicon.ico' />
            </Head>
            <div className={styles.main}>
                <div>
                    <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
                    <div className={styles.description}>
                        Welcome to the DAO!
                    </div>
                    <div className={styles.description}>
                        Your CryptoDevs NFT Balance: {nftBalance}
                        <br />
                        Treasury Balance: {utils.formatEther(
                            treasuryBalance
                        )}{' '}
                        ETH
                        <br />
                        Total Number of Proposals: {numOfProposals}
                    </div>
                    <div className={styles.flex}>
                        <button
                            className={styles.button}
                            onClick={() => setSelectedTab('Create Proposal')}
                        >
                            Create Proposal
                        </button>
                        <button
                            className={styles.button}
                            onClick={() => setSelectedTab('View Proposals')}
                        >
                            View Proposals
                        </button>
                    </div>
                    {renderTabs()}
                </div>
                <div>
                    <img className={styles.image} src='/cryptodevs/0.svg' />
                </div>
            </div>
            <footer className={styles.footer}>
                Made with &#10084; by Crypto Devs
            </footer>
        </div>
    );
}
