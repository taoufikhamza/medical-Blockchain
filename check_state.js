const ControleAcces = artifacts.require("ControleAcces");

module.exports = async function(callback) {
  try {
    const ca = await ControleAcces.deployed();
    const patientAddr = "0x47bd7517fAF33fe2E02C9c2499ef61f6c10BA638".toLowerCase();
    const doctorAddr = "0xE57f73B59461101F3F5239BEB7Ad18EA6c822a5F".toLowerCase();

    const balance = await web3.eth.getBalance(patientAddr);
    console.log("Patient Balance ETH:", web3.utils.fromWei(balance, "ether"));

    const isCertified = await ca.medecinsCertifies(doctorAddr);
    console.log("Is Doctor Certified:", isCertified);

    callback();
  } catch (err) {
    console.error(err);
    callback(err);
  }
};
