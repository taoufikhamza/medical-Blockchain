module.exports = async function(callback) {
  try {
    const accounts = await web3.eth.getAccounts();
    const funder = accounts[0]; // Assume this is wealthy
    
    const patient = "0x47bd7517fAF33fe2E02C9c2499ef61f6c10BA638".toLowerCase();
    const admin = "0xcCe9F083A7EeeB0d50Cc2819dD17a2CEFAd363C6".toLowerCase();
    const secretaire = "0x0608A2Cae489ABB1840BCfc7A15EcC54d4242fb9".toLowerCase();
    const medecin = "0xE57f73B59461101F3F5239BEB7Ad18EA6c822a5F".toLowerCase();

    const amount = web3.utils.toWei("2", "ether");

    console.log("Sending 10 ETH to Patient...");
    await web3.eth.sendTransaction({from: funder, to: patient, value: amount});

    console.log("Sending 10 ETH to Admin...");
    await web3.eth.sendTransaction({from: funder, to: admin, value: amount});

    console.log("Sending 10 ETH to Secrétaire...");
    await web3.eth.sendTransaction({from: funder, to: secretaire, value: amount});

    console.log("Sending 10 ETH to Médecin...");
    await web3.eth.sendTransaction({from: funder, to: medecin, value: amount});

    console.log("Funding complete!");
    callback();
  } catch (error) {
    console.error("Error funding:", error);
    callback(error);
  }
};
