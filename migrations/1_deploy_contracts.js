const ControleAcces = artifacts.require("ControleAcces");
const DossierMedical = artifacts.require("DossierMedical");

module.exports = async function (deployer) {
  // Déployer ControleAcces en premier
  await deployer.deploy(ControleAcces);
  const controleAcces = await ControleAcces.deployed();

  // Déployer DossierMedical avec l'adresse de ControleAcces
  await deployer.deploy(DossierMedical, controleAcces.address);
};