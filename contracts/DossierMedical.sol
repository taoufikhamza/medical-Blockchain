// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./ControleAcces.sol";

contract DossierMedical {

    enum TypeNote { Ordonnance, Texte, Lettre, Avis, Analyse }

    struct Note {
        uint noteId;
        uint dossierId;
        address adresseMedecin;
        TypeNote typeNote;
        string contenu;
        uint timestamp;
    }

    struct Dossier {
        uint dossierId;
        address patientAdresse;
        string nom;
        string prenom;
        string dateNaissance;
        string telephone;
        string email;
        string cin;
        bool estActif;
    }

    ControleAcces private controleAcces;

    uint private compteurDossier = 0;
    uint private compteurNote = 0;

    mapping(uint => Dossier) private dossiers;
    mapping(uint => Note[]) private notesDossier;
    mapping(address => uint[]) private dossiersDuPatient;

    constructor(address _controleAcces) {
        controleAcces = ControleAcces(_controleAcces);
    }

    modifier seulementSecretaire() {
        require(
            controleAcces.secretairesActifs(msg.sender),
            "Acces refuse: Secretaire uniquement"
        );
        _;
    }

    modifier seulementMedecin(uint _dossierId) {
        address patient = dossiers[_dossierId].patientAdresse;
        require(
            controleAcces.droitAcces(patient, msg.sender),
            "Acces refuse: autorisation patient requise"
        );
        _;
    }

    function creerDossier(
        address _patient,
        string memory _nom,
        string memory _prenom,
        string memory _dateNaissance,
        string memory _tel,
        string memory _email,
        string memory _cin
    ) public seulementSecretaire {
        compteurDossier++;
        dossiers[compteurDossier] = Dossier(
            compteurDossier,
            _patient,
            _nom,
            _prenom,
            _dateNaissance,
            _tel,
            _email,
            _cin,
            true
        );
        dossiersDuPatient[_patient].push(compteurDossier);
    }

    function modifierInfosAdmin(
        uint _dossierId,
        string memory _tel,
        string memory _email
    ) public seulementSecretaire {
        require(dossiers[_dossierId].estActif, "Dossier inexistant");
        dossiers[_dossierId].telephone = _tel;
        dossiers[_dossierId].email = _email;
    }

    function ajouterNote(
        uint _dossierId,
        TypeNote _type,
        string memory _contenu
    ) public seulementMedecin(_dossierId) {
        compteurNote++;
        notesDossier[_dossierId].push(Note(
            compteurNote,
            _dossierId,
            msg.sender,
            _type,
            _contenu,
            block.timestamp
        ));
    }

    function getDossier(uint _dossierId) public view returns (Dossier memory) {
        address patient = dossiers[_dossierId].patientAdresse;
        require(
            msg.sender == patient ||
            controleAcces.droitAcces(patient, msg.sender) ||
            controleAcces.secretairesActifs(msg.sender),
            "Acces refuse"
        );
        return dossiers[_dossierId];
    }

    function getMesDossiers() public view returns (uint[] memory) {
        return dossiersDuPatient[msg.sender];
    }

    function getNotes(uint _dossierId) public view returns (Note[] memory) {
        address patient = dossiers[_dossierId].patientAdresse;
        require(
            msg.sender == patient ||
            controleAcces.droitAcces(patient, msg.sender),
            "Acces refuse"
        );
        return notesDossier[_dossierId];
    }
}