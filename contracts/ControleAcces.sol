// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract ControleAcces {
    
    enum Role { Admin, Secretaire, Medecin, Patient }
    
    address public admin;
    
    mapping(address => Role) public roles;
    mapping(address => bool) public medecinsCertifies;
    mapping(address => bool) public secretairesActifs;
    mapping(address => mapping(address => bool)) public autorisations;
    
    modifier seulementAdmin() {
        require(msg.sender == admin, "Acces refuse: Admin uniquement");
        _;
    }
    
    modifier seulementSecretaire() {
        require(secretairesActifs[msg.sender], "Acces refuse: Secretaire uniquement");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        roles[msg.sender] = Role.Admin;
    }
    
    function enregistrerSecretaire(address _secretaire) public seulementAdmin {
        secretairesActifs[_secretaire] = true;
        roles[_secretaire] = Role.Secretaire;
    }
    
    function desactiverSecretaire(address _secretaire) public seulementAdmin {
        secretairesActifs[_secretaire] = false;
    }
    
    function certifierMedecin(address _medecin) public seulementAdmin {
        medecinsCertifies[_medecin] = true;
        roles[_medecin] = Role.Medecin;
    }
    
    function desactiverMedecin(address _medecin) public seulementAdmin {
        medecinsCertifies[_medecin] = false;
    }
    
    function autoriserAcces(address _medecin) public {
        require(medecinsCertifies[_medecin], "Medecin non certifie");
        autorisations[msg.sender][_medecin] = true;
    }
    
    function retirerAcces(address _medecin) public {
        autorisations[msg.sender][_medecin] = false;
    }
    
    function droitAcces(address _patient, address _medecin) public view returns (bool) {
        return autorisations[_patient][_medecin];
    }
    
    function getRole(address _adresse) public view returns (Role) {
        return roles[_adresse];
    }
}