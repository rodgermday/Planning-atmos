import { useState, useMemo, useEffect, useRef } from "react";

const SKIPPERS_DEFAULT = [
  { id: "charly", nom: "Charly", bateau: "atom" },
  { id: "maxence", nom: "Maxence", bateau: "natural" },
  { id: "stephen", nom: "Stephen", bateau: "poker" },
];

const BATEAUX = [
  { id: "atom", nom: "Atom", details: "36 pieds • 2x250 Mercury", skipper_default: "charly", color: "#00e0b0", colorBg: "rgba(0,224,176,0.12)", colorBorder: "rgba(0,224,176,0.25)" },
  { id: "natural", nom: "Natural M", details: "36 pieds • 2x300 Mercury", skipper_default: "maxence", color: "#ff6eb4", colorBg: "rgba(255,110,180,0.12)", colorBorder: "rgba(255,110,180,0.25)" },
  { id: "poker", nom: "Poker Run", details: "48 pieds • 3x300 Mercury", skipper_default: "stephen", color: "#00c8ff", colorBg: "rgba(0,200,255,0.12)", colorBorder: "rgba(0,200,255,0.25)" },
];

// Points d'embarquement dans l'ordre fixe
const DEPARTS = [
  { id: "marina", nom: "Marina Pointe-à-Pitre", nom_court: "Marina", heure_rdv: "8h30", heure_retour: "16h15" },
  { id: "creole", nom: "Créole Beach — Le Gosier", nom_court: "Créole Beach", heure_rdv: "8h45", heure_retour: "16h00" },
];

const DESTINATIONS = [
  { id: "gcm", nom: "Grand Cul de Sac Marin", tarif_adulte: 115, tarif_enfant: 95, tarif_privatif: 1350 },
  { id: "saintes", nom: "Les Saintes", tarif_adulte: 155, tarif_enfant: 125, tarif_privatif: 1550 },
  { id: "mg", nom: "Marie-Galante", tarif_adulte: 155, tarif_enfant: 125, tarif_privatif: 1550 },
];

const REPAS_OPTIONS = [
  { id: "poisson", nom: "Poisson", emoji: "🐟" },
  { id: "poulet", nom: "Poulet", emoji: "🍗" },
  { id: "autre", nom: "Spécificité", emoji: "⚠️" },
];

// Types de règlement
const TYPES_REGLEMENT = [
  { id: "comptant", nom: "Comptant", emoji: "✅" },
  { id: "acompte", nom: "Acompte", emoji: "💰" },
  { id: "lien", nom: "Lien de paiement", emoji: "🔗" },
];

// Moyens de paiement
const MODES_PAIEMENT = [
  { id: "especes", nom: "Espèces", emoji: "💵" },
  { id: "cb", nom: "Carte bancaire", emoji: "💳" },
  { id: "cheque_vac", nom: "Chèque vacances", emoji: "🎫" },
  { id: "virement", nom: "Virement", emoji: "🏦" },
];

const TYPE_VENDEUR = [
  { id: "employe", nom: "Employé base" },
  { id: "agence", nom: "Agence" },
  { id: "commercial", nom: "Commercial indépendant" },
];

const VENDEURS = {
  employe: [
    { id: "virginie", nom: "Virginie", commission: 0 },
  ],
  commercial: [
    { id: "anthony", nom: "Anthony", commission: 10 },
    { id: "marc", nom: "Marc", commission: 20 },
  ],
  agence: [
    { id: "coeur_iles", nom: "Cœur des Îles", commission: 20 },
    { id: "passion_om", nom: "Passion Outre-Mer", commission: 20 },
    { id: "suntravel", nom: "Suntravel", commission: 20 },
  ],
};

function getCommission(type_vendeur, vendeurNom) {
  const liste = VENDEURS[type_vendeur] || [];
  const v = liste.find(x => x.nom === vendeurNom);
  return v ? v.commission : 20;
}

const CAPACITE = 12;

function getDateStrGP(date) {
  // Guadeloupe = UTC-4, pas de changement d'heure
  const gp = new Date(date.getTime() - 4 * 60 * 60 * 1000);
  return gp.toISOString().split("T")[0];
}
function getDateStr(date) { return getDateStrGP(date); }
function getHeureGP() {
  const now = new Date();
  const gp = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  return { h: gp.getUTCHours(), m: gp.getUTCMinutes(), total: gp.getUTCHours() * 60 + gp.getUTCMinutes() };
}
function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatDateShort(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
function getMonthStr(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
function getDaysAround(centerDate, count = 21) {
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(centerDate); d.setDate(d.getDate() + i);
    days.push(getDateStr(d));
  }
  return days;
}
function calcMontant(pax, destination, privatif) {
  const dest = DESTINATIONS.find(d => d.id === destination);
  if (!dest) return 0;
  if (privatif) return dest.tarif_privatif;
  return pax * dest.tarif_adulte;
}
function getSkipper(bateauId, date, skippersJour) {
  const skipperId = skippersJour[`${bateauId}_${date}`] ?? BATEAUX.find(b => b.id === bateauId)?.skipper_default;
  return SKIPPERS_DEFAULT.find(s => s.id === skipperId);
}
function getDestinationVerrouillee(reservations, bateauId, date) {
  const res = reservations.find(r => r.bateau === bateauId && r.date === date && r.statut !== "annule");
  return res ? res.destination : null;
}
function estDateAutorisee(dateStr) {
  const { total } = getHeureGP();
  const limite = 7 * 60 + 30; // 7h30 heure Guadeloupe
  const aujourdhuiGP = getDateStrGP(new Date());
  if (dateStr === aujourdhuiGP) {
    return total < limite;
  }
  return dateStr > aujourdhuiGP;
}

function getStatutPaiementLabel(statut) {
  const labels = {
    acompte_recu: { label: "Acompte reçu", color: "#ffaa00" },
    lien_envoye: { label: "Lien envoyé 🔗", color: "#00b4ff" },
    solde_du: { label: "Solde dû", color: "#ff6644" },
    solde: { label: "Soldé ✓", color: "#00cc88" },
    commission_gardee: { label: "Commission gardée", color: "#ffaa00" },
    facturation_en_cours: { label: "À facturer", color: "#ff6644" },
    facture_envoyee: { label: "Facture envoyée", color: "#ffaa00" },
    paye: { label: "Payé ✓", color: "#00cc88" },
    comptant: { label: "Payé comptant ✓", color: "#00cc88" },
  };
  return labels[statut] || { label: statut, color: "#5b8db8" };
}

// Retourne les stops d'embarquement d'un bateau pour une date
// triés dans l'ordre Marina → Créole
function getStopsEmbarquement(reservations, bateauId, date) {
  const res = reservations.filter(r => r.bateau === bateauId && r.date === date && r.statut !== "annule");
  const stopsMap = {};
  res.forEach(r => {
    const dep = r.depart;
    if (!stopsMap[dep]) stopsMap[dep] = [];
    stopsMap[dep].push(r);
  });
  // Ordre fixe : marina en premier, créole ensuite
  return DEPARTS.filter(d => stopsMap[d.id]).map(d => ({ depart: d, reservations: stopsMap[d.id] }));
}

const today = getDateStr(new Date());
const thisMonth = today.slice(0, 7);

const initialReservations = [];

const emptyForm = (bateauId, date, destVerrouillee) => ({
  bateau: bateauId || BATEAUX[0].id, date: date || today,
  destination: destVerrouillee || "gcm",
  depart: "creole", retour: "creole",
  pax: 1, privatif: false,
  client: "", contact: "",
  type_vendeur: "employe", vendeur: "", agence_nom: "",
  encaisseur_solde: "", statut_paiement: "acompte_recu", acompte_montant: 0,
  type_reglement: "comptant",
  mode_paiement_initial: "cb",
  encaissements: [],
  statut: "confirme",
  repas: [{ type: "poisson", nb: 0 }, { type: "poulet", nb: 0 }, { type: "autre", nb: 0 }],
  repas_detail: "",
});

function calcRepasParBateau(reservations, date, skippersJour) {
  return BATEAUX.map(bateau => {
    const res = reservations.filter(r => r.bateau === bateau.id && r.date === date && r.statut !== "annule");
    const totaux = { poisson: 0, poulet: 0, autre: 0 };
    const specificites = [];
    res.forEach(r => {
      r.repas?.forEach(rep => { totaux[rep.type] = (totaux[rep.type] || 0) + rep.nb; });
      if (r.repas_detail) specificites.push(`${r.client}: ${r.repas_detail}`);
    });
    const dest = res.length > 0 ? DESTINATIONS.find(d => d.id === res[0].destination) : null;
    const skipper = getSkipper(bateau.id, date, skippersJour);
    const nbPax = res.reduce((a, r) => a + (r.privatif ? CAPACITE : r.pax), 0);
    const stops = getStopsEmbarquement(res.map(r => r), bateau.id, date);
    return { bateau, totaux, specificites, dest, skipper, nbPax, stops, res };
  }).filter(b => b.nbPax > 0);
}

// Stops pour le brief skipper (depuis reservations déjà filtrées par bateau/date)
function getStopsFromRes(res) {
  const stopsMap = {};
  res.forEach(r => {
    const dep = r.depart;
    if (!stopsMap[dep]) stopsMap[dep] = [];
    stopsMap[dep].push(r);
  });
  return DEPARTS.filter(d => stopsMap[d.id]).map(d => ({ depart: d, reservations: stopsMap[d.id] }));
}

function genMsgTraiteur(date, data, isUpdate, newRes) {
  const dateStr = formatDate(date);
  let msg = isUpdate ? `🔔 *MISE À JOUR REPAS — ${dateStr.toUpperCase()}*\n\n` : `📋 *RÉCAP REPAS TRAITEUR — ${dateStr.toUpperCase()}*\n\n`;
  if (isUpdate && newRes) msg += `Nouvelle réservation :\n👤 ${newRes.client} — ${BATEAUX.find(b => b.id === newRes.bateau)?.nom}\n\n`;
  data.forEach(({ bateau, totaux, specificites, dest, nbPax }) => {
    msg += `🚤 *${bateau.nom.toUpperCase()}*`;
    if (dest) msg += ` — ${dest.nom}`;
    msg += `\n👥 ${nbPax} passagers\n`;
    if (totaux.poisson > 0) msg += `🐟 Poisson : ${totaux.poisson}\n`;
    if (totaux.poulet > 0) msg += `🍗 Poulet : ${totaux.poulet}\n`;
    if (totaux.autre > 0) { msg += `⚠️ Spécificités : ${totaux.autre}\n`; specificites.forEach(s => msg += `   → ${s}\n`); }
    msg += `\n`;
  });
  const tp = data.reduce((a, b) => a + b.totaux.poisson, 0);
  const tpo = data.reduce((a, b) => a + b.totaux.poulet, 0);
  const ta = data.reduce((a, b) => a + b.totaux.autre, 0);
  msg += `─────────────────\n📊 *TOTAL GÉNÉRAL*\n`;
  if (tp > 0) msg += `🐟 Poisson : ${tp}\n`;
  if (tpo > 0) msg += `🍗 Poulet : ${tpo}\n`;
  if (ta > 0) msg += `⚠️ Spécificités : ${ta}\n`;
  msg += `\n_Atmosphere — Gestion Navettes_`;
  return msg;
}

function genMsgSkipper(date, bateauData, isUpdate) {
  const { bateau, totaux, specificites, dest, skipper, nbPax, res } = bateauData;
  const dateStr = formatDate(date);
  const stops = getStopsFromRes(res);
  let msg = isUpdate
    ? `🔔 *MISE À JOUR — ${bateau.nom.toUpperCase()} — ${dateStr.toUpperCase()}*\n\n`
    : `⚓ *BRIEF SKIPPER — ${bateau.nom.toUpperCase()} — ${dateStr.toUpperCase()}*\n\n`;
  msg += `Bonjour ${skipper?.nom || ""} 👋\n\n`;
  msg += `🗺️ *Destination :* ${dest?.nom || "—"}\n`;
  msg += `👥 *Total passagers : ${nbPax}*\n\n`;

  // Stops dans l'ordre
  msg += `📍 *PROGRAMME D'EMBARQUEMENT :*\n`;
  stops.forEach((stop, idx) => {
    const paxStop = stop.reservations.reduce((a, r) => a + (r.privatif ? CAPACITE : r.pax), 0);
    msg += `\n${idx + 1}. *${stop.depart.nom_court}* — RDV ${stop.depart.heure_rdv}\n`;
    msg += `   👥 ${paxStop} passager${paxStop > 1 ? "s" : ""}\n`;
    stop.reservations.forEach(r => {
      msg += `   • ${r.client} (${r.privatif ? CAPACITE : r.pax} pax) — ${r.vendeur || r.agence_nom}\n`;
    });
  });

  msg += `\n🍽️ *REPAS À BORD :*\n`;
  if (totaux.poisson > 0) msg += `🐟 Poisson : ${totaux.poisson}\n`;
  if (totaux.poulet > 0) msg += `🍗 Poulet : ${totaux.poulet}\n`;
  if (totaux.autre > 0) {
    msg += `⚠️ Spécificités : ${totaux.autre}\n`;
    specificites.forEach(s => msg += `   → ${s}\n`);
  }

  // Retours
  const retours = {};
  res.forEach(r => {
    const ret = DEPARTS.find(d => d.id === r.retour);
    if (!retours[r.retour]) retours[r.retour] = { dep: ret, clients: [] };
    retours[r.retour].clients.push(r.client);
  });
  const retoursList = Object.values(retours);
  if (retoursList.length > 0) {
    msg += `\n🔙 *RETOURS :*\n`;
    retoursList.forEach(({ dep, clients }) => {
      msg += `${dep?.nom_court} (${dep?.heure_retour}) — ${clients.join(", ")}\n`;
    });
  }

  msg += `\n_Atmosphere — Bonne sortie ! 🌊_`;
  return msg;
}

// Composant compteur +/-
function Counter({ value, onChange, min = 0, max, label, color = "#e8edf5", sublabel }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px" }}>
      <div>
        <span style={{ fontSize: 13, color: "#5b8db8" }}>{label}</span>
        {sublabel && <div style={{ fontSize: 11, color: "#3a5a6a" }}>{sublabel}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
          style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: value <= min ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.1)", color: value <= min ? "#3a4a5a" : "#e8edf5", cursor: value <= min ? "default" : "pointer", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
        <span style={{ fontSize: 20, fontWeight: 700, minWidth: 28, textAlign: "center", color }}>{value}</span>
        <button onClick={() => onChange(Math.min(max ?? 99, value + 1))} disabled={value >= (max ?? 99)}
          style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: value >= (max ?? 99) ? "rgba(255,255,255,0.04)" : "rgba(0,180,255,0.2)", color: value >= (max ?? 99) ? "#3a4a5a" : "#00b4ff", cursor: value >= (max ?? 99) ? "default" : "pointer", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
      </div>
    </div>
  );
}

const inputSt = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e8edf5", fontSize: 14, boxSizing: "border-box", outline: "none" };
const labelSt = { fontSize: 12, color: "#5b8db8", display: "block", marginBottom: 6, letterSpacing: 0.5 };
const cardSt = { background: "linear-gradient(135deg,#0d1b2e,#0a2235)", border: "1px solid rgba(0,180,255,0.12)", borderRadius: 16, padding: 20 };

export default function App() {
  const [reservations, setReservations] = useState([]);
  const [skippersJour, setSkippersJour] = useState({});
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // Charger les données au démarrage
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    async function charger() {
      try {
        const res = await window.storage.get("atmosphere_reservations");
        if (res && res.value) {
          const loaded = JSON.parse(res.value);
          setReservations(loaded);
          // Aller au prochain jour avec une sortie
          const actives = loaded.filter(r => r.statut !== "annule");
          const joursAvecResa = [...new Set(actives.map(r => r.date))].filter(d => d >= today).sort();
          if (joursAvecResa.length > 0) setDateSel(joursAvecResa[0]);
        }
      } catch (e) { /* première ouverture, pas de données */ }
      try {
        const sk = await window.storage.get("atmosphere_skippers");
        if (sk && sk.value) setSkippersJour(JSON.parse(sk.value));
      } catch (e) {}
      setLoading(false);
    }
    charger();
  }, []);
  const [vue, setVue] = useState("planning");
  const [dateSel, setDateSel] = useState(() => {
    // Par défaut : le prochain jour avec une réservation, sinon demain
    const resActives = initialReservations.filter(r => r.statut !== "annule");
    const joursAvecResa = [...new Set(resActives.map(r => r.date))].filter(d => d >= today).sort();
    return joursAvecResa.length > 0 ? joursAvecResa[0] : (() => {
      const d = new Date(); d.setDate(d.getDate() + 1); return getDateStr(d);
    })();
  });
  const [form, setForm] = useState(null);
  const [detail, setDetail] = useState(null);
  const [recapModal, setRecapModal] = useState(null);
  const [notifModal, setNotifModal] = useState(null);
  const [copied, setCopied] = useState(null);
  const [skipperModal, setSkipperModal] = useState(null);
  const [paiementModal, setPaiementModal] = useState(null);
  const [encForm, setEncForm] = useState({ montant: 0, mode: "cb", encaisseur: "" });
  const [moisAgence, setMoisAgence] = useState(thisMonth);

  const jours = getDaysAround(new Date(today + "T12:00:00"), 21);

  // Sauvegarder dans le storage à chaque changement
  useEffect(() => {
    if (loading) return;
    window.storage.set("atmosphere_reservations", JSON.stringify(reservations)).catch(() => {});
  }, [reservations, loading]);

  useEffect(() => {
    if (loading) return;
    window.storage.set("atmosphere_skippers", JSON.stringify(skippersJour)).catch(() => {});
  }, [skippersJour, loading]);

  function placesOccupees(bateauId, date) {
    return reservations.filter(r => r.bateau === bateauId && r.date === date && r.statut !== "annule")
      .reduce((acc, r) => acc + (r.privatif ? CAPACITE : r.pax), 0);
  }

  function ouvrirForm(bateauId, date) {
    const dest = getDestinationVerrouillee(reservations, bateauId, date);
    setForm(emptyForm(bateauId, date, dest));
    setVue("nouvelle");
  }

  function sauvegarder() {
    if (!form.client || !form.contact) return;
    if (!estDateAutorisee(form.date)) {
      alert("Inscription impossible — les réservations du jour ne sont acceptées qu\'avant 7h30.");
      return;
    }
    const paxDemandes = form.privatif ? CAPACITE : form.pax;
    const dispo = CAPACITE - placesOccupees(form.bateau, form.date);
    if (paxDemandes > dispo) return;
    const totalRepas = form.repas.reduce((a, x) => a + x.nb, 0);
    if (totalRepas > paxDemandes) return;
    const mt = calcMontant(form.pax, form.destination, form.privatif);
    const commPct = getCommission(form.type_vendeur, form.vendeur);
    const acompteMt = Math.round(mt * commPct / 100);
    const totalEncaisse = (form.encaissements || []).reduce((a, e) => a + e.montant, 0);
    const encaissementsFinaux = (form.encaissements || []).map(e => ({ ...e, date: formatDateShort(form.date) }));
    const aUnSoldeJour = encaissementsFinaux.some(e => e.mode === "solde_jour");
    const aUnLien = form.type_reglement === "lien";
    let statutPaiement;
    if (form.type_vendeur === "agence") {
      statutPaiement = "facturation_en_cours";
    } else if (aUnLien) {
      statutPaiement = "lien_envoye";
    } else if (totalEncaisse >= mt) {
      statutPaiement = "solde";
    } else if (aUnSoldeJour) {
      statutPaiement = "acompte_recu";
    } else if (totalEncaisse > 0) {
      statutPaiement = "acompte_recu";
    } else if (form.type_vendeur === "commercial") {
      statutPaiement = "commission_gardee";
    } else {
      statutPaiement = "solde_du";
    }
    const newRes = { ...form, id: "r" + Date.now(), acompte_montant: acompteMt, encaissements: encaissementsFinaux, statut_paiement: statutPaiement, _encMontant: undefined };
    const newReservations = [...reservations, newRes];
    setReservations(newReservations);
    const data = calcRepasParBateau(newReservations, form.date, skippersJour);
    const msgTraiteur = genMsgTraiteur(form.date, data, true, newRes);
    const bateauData = data.find(d => d.bateau.id === form.bateau);
    const msgSkipper = bateauData ? genMsgSkipper(form.date, bateauData, true) : "";
    setNotifModal({ msgTraiteur, msgSkipper, date: form.date, skipper: bateauData?.skipper, bateau: bateauData?.bateau });
    setVue("planning");
    setForm(null);
  }

  function annulerResa(id) { setReservations(reservations.map(r => r.id === id ? { ...r, statut: "annule" } : r)); setDetail(null); }
  function mettreAJourPaiement(id, updates) {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    setPaiementModal(null);
  }
  function enregistrerEncaissement(id, newEncaissements, nouveauStatut) {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, encaissements: newEncaissements, statut_paiement: nouveauStatut } : r));
    // Mettre à jour paiementModal pour refléter les nouveaux encaissements sans fermer
    setPaiementModal(prev => prev ? { ...prev, encaissements: newEncaissements, statut_paiement: nouveauStatut } : null);
  }
  function ouvrirPaiement(r) {
    const mt = calcMontant(r.pax, r.destination, r.privatif);
    const totalEnc = (r.encaissements || []).reduce((a, e) => a + e.montant, 0);
    setEncForm({ montant: Math.max(0, mt - totalEnc), mode: "cb", encaisseur: "" });
    setPaiementModal(r);
  }
  function changerSkipper(bateauId, date, skipperId) { setSkippersJour(prev => ({ ...prev, [`${bateauId}_${date}`]: skipperId })); setSkipperModal(null); }
  function copier(text, key) { navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 2000); }); }

  function ouvrirRecap(date) {
    const data = calcRepasParBateau(reservations, date, skippersJour);
    setRecapModal({
      date, data,
      msgTraiteur: genMsgTraiteur(date, data, false, null),
      msgsSkipper: data.map(d => ({ skipper: d.skipper, bateau: d.bateau, msg: genMsgSkipper(date, d, false) }))
    });
  }

  // Calculs formulaire
  // useMemo en premier
  const resActives = useMemo(() => reservations.filter(r => r.statut !== "annule"), [reservations]);
  const resJour = useMemo(() => reservations.filter(r => r.date === dateSel && r.statut !== "annule"), [reservations, dateSel]);
  const repasJour = useMemo(() => calcRepasParBateau(reservations, dateSel, skippersJour), [reservations, dateSel, skippersJour]);
  const soldesDus = useMemo(() => resActives.filter(r => r.statut_paiement === "solde_du" || r.statut_paiement === "commission_gardee"), [resActives]);
  const resAgencesMois = useMemo(() => resActives.filter(r => r.type_vendeur === "agence" && r.date.startsWith(moisAgence)), [resActives, moisAgence]);
  const agencesUniques = useMemo(() => {
    const noms = [...new Set(resAgencesMois.map(r => r.agence_nom).filter(Boolean))];
    return noms.map(nom => {
      const res = resAgencesMois.filter(r => r.agence_nom === nom);
      const totalBrut = res.reduce((a, r) => a + calcMontant(r.pax, r.destination, r.privatif), 0);
      const commission = Math.round(totalBrut * 0.2);
      return { nom, res, totalBrut, commission, netDu: totalBrut - commission };
    });
  }, [resAgencesMois]);
  const totalCA = useMemo(() => resActives.reduce((acc, r) => acc + calcMontant(r.pax, r.destination, r.privatif), 0), [resActives]);
  const totalSoldesDus = useMemo(() => soldesDus.reduce((acc, r) => { const mt = calcMontant(r.pax, r.destination, r.privatif); return acc + (mt - r.acompte_montant); }, 0), [soldesDus]);
  const caJour = useMemo(() => resJour.reduce((acc, r) => acc + calcMontant(r.pax, r.destination, r.privatif), 0), [resJour]);
  // Jours avec sorties pour le sélecteur de dates
  // Vérifier si une date est saisissable
  const dateAutorisee = (dateStr) => estDateAutorisee(dateStr);

  const joursAvecSorties = useMemo(() => {
    const map = {};
    reservations.filter(r => r.statut !== "annule").forEach(r => {
      if (!map[r.date]) map[r.date] = { bateaux: [], totalPax: 0, totalDispo: 0 };
      if (!map[r.date].bateaux.includes(r.bateau)) map[r.date].bateaux.push(r.bateau);
      map[r.date].totalPax += r.privatif ? CAPACITE : r.pax;
    });
    Object.keys(map).forEach(date => {
      const totalOccup = map[date].totalPax;
      map[date].totalDispo = (map[date].bateaux.length * CAPACITE) - totalOccup;
    });
    return map;
  }, [reservations]);

  const placesParBateau = useMemo(() => BATEAUX.map(b => {
    const occup = reservations.filter(r => r.bateau === b.id && r.date === dateSel && r.statut !== "annule").reduce((acc, r) => acc + (r.privatif ? CAPACITE : r.pax), 0);
    const dispo = CAPACITE - occup;
    return { bateau: b, occup, dispo, pct: Math.round((occup / CAPACITE) * 100) };
  }), [reservations, dateSel]);

  const caParBateau = useMemo(() => BATEAUX.map(b => ({
    bateau: b,
    ca: resJour.filter(r => r.bateau === b.id).reduce((acc, r) => acc + calcMontant(r.pax, r.destination, r.privatif), 0),
    pax: resJour.filter(r => r.bateau === b.id).reduce((acc, r) => acc + (r.privatif ? CAPACITE : r.pax), 0),
  })).filter(b => b.ca > 0), [resJour]);
  const soldesJour = useMemo(() => resJour.filter(r => r.statut_paiement === "solde_du" || r.statut_paiement === "commission_gardee").reduce((acc, r) => { const mt = calcMontant(r.pax, r.destination, r.privatif); return acc + (mt - r.acompte_montant); }, 0), [resJour]);
  const agencesAFacturer = useMemo(() => [...new Set(resActives.filter(r => r.type_vendeur === "agence" && r.statut_paiement === "facturation_en_cours").map(r => r.agence_nom))].length, [resActives]);

  // Calculs formulaire (après les useMemo)
  const dispoForm = form ? CAPACITE - placesOccupees(form.bateau, form.date) : CAPACITE;
  const depassePlaces = form ? paxForm > dispoForm : false;
  const depasRepas = form ? totalRepasForm > paxForm : false;
  const paxForm = form ? (form.privatif ? CAPACITE : form.pax) : 0;
  const totalRepasForm = form ? form.repas.reduce((a, x) => a + x.nb, 0) : 0;
  const repasRestants = paxForm - totalRepasForm;
  const montant = form ? calcMontant(form.pax, form.destination, form.privatif) : 0;
  const acompte = Math.round(montant * 0.2);
  const destVerrouillee = form ? getDestinationVerrouillee(reservations, form.bateau, form.date) : null;
  const formValide = form && form.client && form.contact && paxForm <= dispoForm && totalRepasForm <= paxForm;
  const tropEncaisse = form ? (form.encaissements || []).reduce((a, e) => a + e.montant, 0) > montant : false;
  // CA temps réel pendant la saisie
  const caEnCours = form ? calcMontant(form.pax, form.destination, form.privatif) : 0;
  const caJourAvecSaisie = caJour + (form && form.date === dateSel ? caEnCours : 0);
  const soldesJourAvecSaisie = soldesJour + (form && form.date === dateSel && (form.type_vendeur === "employe" || form.type_vendeur === "commercial") ? (caEnCours - Math.round(caEnCours * 0.2)) : 0);

  const VUES = [["planning", "📅 Planning"], ["paiements", "💰 Paiements"], ["agences", "🏢 Agences"], ["reservations", "📋 Réservations"]];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚓</div>
        <div style={{ color: "#00b4ff", fontSize: 16, fontWeight: 600 }}>Chargement Atmosphere...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#e8edf5" }}>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg,#0d1b2e,#0a2a4a)", borderBottom: "1px solid rgba(0,180,255,0.15)", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, fontSize: 18, background: "linear-gradient(135deg,#00b4ff,#0066cc)", display: "flex", alignItems: "center", justifyContent: "center" }}>⚓</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Planning Atmosphere</div>
            <div style={{ fontSize: 11, color: "#5b8db8", letterSpacing: 1 }}>GESTION NAVETTES</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {VUES.map(([v, lbl]) => (
            <button key={v} onClick={() => setVue(v)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: vue === v ? "rgba(0,180,255,0.2)" : "transparent", color: vue === v ? "#00b4ff" : "#5b8db8" }}>{lbl}</button>
          ))}
          <button onClick={() => ouvrirForm()} style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,#00b4ff,#0066cc)", color: "white" }}>+ Nouvelle</button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ background: "rgba(0,180,255,0.05)", borderBottom: "1px solid rgba(0,180,255,0.08)", padding: "12px 24px", display: "flex", gap: 0 }}>
        <div style={{ flex: 2, borderRight: "1px solid rgba(255,255,255,0.06)", paddingRight: 24 }}>
          <div style={{ fontSize: 11, color: "#5b8db8", marginBottom: 6 }}>
            CA — {dateSel === today ? "Aujourd'hui" : formatDateShort(dateSel)}
            {form && form.date === dateSel && caEnCours > 0 && <span style={{ color: "#ffaa00", marginLeft: 6 }}>+ {caEnCours.toLocaleString("fr-FR")} € en cours</span>}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#e8edf5" }}>{caJourAvecSaisie.toLocaleString("fr-FR")} €</div>
            {caParBateau.map(({ bateau, ca, pax }) => (
              <div key={bateau.id} style={{ display: "flex", alignItems: "center", gap: 6, background: bateau.colorBg, border: `1px solid ${bateau.colorBorder}`, borderRadius: 20, padding: "3px 10px" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: bateau.color }}>{bateau.nom}</span>
                <span style={{ fontSize: 12, color: "#e8edf5", fontWeight: 600 }}>{ca.toLocaleString("fr-FR")} €</span>
                <span style={{ fontSize: 11, color: "#5b8db8" }}>{pax} pax</span>
              </div>
            ))}
            {form && form.date === dateSel && caEnCours > 0 && (() => { const b = BATEAUX.find(x => x.id === form.bateau); return b ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: b.colorBg, border: `1px dashed ${b.colorBorder}`, borderRadius: 20, padding: "3px 10px", opacity: 0.7 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: b.color }}>{b.nom}</span>
                <span style={{ fontSize: 12, color: "#ffaa00", fontWeight: 600 }}>+{caEnCours.toLocaleString("fr-FR")} €</span>
                <span style={{ fontSize: 11, color: "#5b8db8" }}>en cours</span>
              </div>
            ) : null; })()}
          </div>
          {/* Places disponibles dans la barre */}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {placesParBateau.map(({ bateau, occup, dispo }) => {
              const couleur = dispo === 0 ? "#ff4444" : dispo <= 3 ? "#ffaa00" : bateau.color;
              return (
                <div key={bateau.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: couleur }} />
                  <span style={{ fontSize: 11, color: couleur, fontWeight: 700 }}>{bateau.nom}</span>
                  <span style={{ fontSize: 11, color: "#5b8db8" }}>{dispo === 0 ? "complet" : `${dispo} pl. dispo`}</span>
                  {/* Mini barre */}
                  <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)" }}>
                    <div style={{ width: `${(occup / CAPACITE) * 100}%`, height: "100%", borderRadius: 2, background: couleur }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1, borderRight: "1px solid rgba(255,255,255,0.06)", paddingLeft: 24, paddingRight: 24 }}>
          <div style={{ fontSize: 11, color: "#5b8db8", marginBottom: 2 }}>Soldes à encaisser ce jour</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: soldesJourAvecSaisie > 0 ? "#ff6644" : "#00cc88" }}>{soldesJourAvecSaisie > 0 ? soldesJourAvecSaisie.toLocaleString("fr-FR") + " €" : "Tout est bon ✓"}</div>
          <div style={{ fontSize: 11, color: "#3a5a6a", marginTop: 2 }}>{resJour.filter(r => r.statut_paiement === "solde_du" || r.statut_paiement === "commission_gardee").length} en attente</div>
        </div>
        <div style={{ flex: 1, paddingLeft: 24 }}>
          <div style={{ fontSize: 11, color: "#5b8db8", marginBottom: 2 }}>Agences à facturer</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: agencesAFacturer > 0 ? "#ffaa00" : "#00cc88" }}>{agencesAFacturer > 0 ? agencesAFacturer + " agence" + (agencesAFacturer > 1 ? "s" : "") : "Rien en attente ✓"}</div>
          <div style={{ fontSize: 11, color: "#3a5a6a", marginTop: 2 }}>toutes périodes</div>
        </div>
      </div>

      <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>

        {/* NOTIF */}
        {notifModal && (() => {
          const batNotif = BATEAUX.find(b => b.id === notifModal.bateau?.id) || notifModal.bateau;
          return (
          <div style={{ background: `linear-gradient(135deg,${batNotif?.colorBg || "rgba(0,200,100,0.1)"},rgba(0,0,0,0.3))`, border: `1px solid ${batNotif?.colorBorder || "rgba(0,200,100,0.25)"}`, borderTop: `3px solid ${batNotif?.color || "#00cc88"}`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#00cc88" }}>✅ Réservation confirmée — Messages prêts</div>
              <button onClick={() => setNotifModal(null)} style={{ background: "transparent", border: "none", color: "#5b8db8", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Traiteur */}
              <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, color: "#ffaa00", fontWeight: 700, marginBottom: 8 }}>🍽️ TRAITEUR</div>
                <pre style={{ fontSize: 11, color: "#c8d8e8", whiteSpace: "pre-wrap", fontFamily: "monospace", maxHeight: 150, overflowY: "auto", margin: "0 0 10px" }}>{notifModal.msgTraiteur}</pre>
                <button onClick={() => copier(notifModal.msgTraiteur, "nt")} style={{ padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: copied === "nt" ? "rgba(0,204,136,0.3)" : "rgba(37,211,102,0.15)", color: copied === "nt" ? "#00cc88" : "#25d366", fontSize: 12, fontWeight: 700 }}>{copied === "nt" ? "✓ Copié !" : "📋 Copier"}</button>
              </div>
              {/* Skipper — couleur du bateau */}
              <div style={{ background: batNotif?.colorBg, border: `1px solid ${batNotif?.colorBorder}`, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, color: batNotif?.color, fontWeight: 700, marginBottom: 8 }}>⚓ SKIPPER — {notifModal.skipper?.nom} ({notifModal.bateau?.nom})</div>
                <pre style={{ fontSize: 11, color: "#c8d8e8", whiteSpace: "pre-wrap", fontFamily: "monospace", maxHeight: 150, overflowY: "auto", margin: "0 0 10px" }}>{notifModal.msgSkipper}</pre>
                <button onClick={() => copier(notifModal.msgSkipper, "ns")} style={{ padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: copied === "ns" ? "rgba(0,204,136,0.3)" : batNotif?.colorBg, color: copied === "ns" ? "#00cc88" : batNotif?.color, fontSize: 12, fontWeight: 700 }}>{copied === "ns" ? "✓ Copié !" : "📋 Copier"}</button>
              </div>
            </div>
          </div>
          );
        })()}

        {/* ── PLANNING ── */}
        {vue === "planning" && (
          <div>
            <div style={{ overflowX: "auto", marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 8, minWidth: "max-content" }}>
                {jours.map(jour => {
                  const info = joursAvecSorties[jour];
                  const estSelectionne = dateSel === jour;
                  const estAujourdhui = jour === today;
                  const estAutorise = estDateAutorisee(jour);
                  const estPasse = jour < today;
                  const bateauxDuJour = info ? info.bateaux.map(id => BATEAUX.find(b => b.id === id)).filter(Boolean) : [];
                  return (
                    <button key={jour} onClick={() => setDateSel(jour)} style={{
                      padding: "8px 14px", borderRadius: 10, border: "1px solid", cursor: "pointer",
                      borderColor: estSelectionne ? "#00b4ff" : info ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                      background: estSelectionne ? "rgba(0,180,255,0.15)" : info ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                      color: estSelectionne ? "#00b4ff" : estPasse ? "#2a3a4a" : estAujourdhui ? "#fff" : info ? "#e8edf5" : "#3a4a5a",
                      fontSize: 12, fontWeight: estSelectionne || info ? 700 : 400, whiteSpace: "nowrap",
                      minWidth: 80, textAlign: "center",
                      opacity: estPasse ? 0.5 : 1,
                    }}>
                      <div>{estAujourdhui ? "Aujourd'hui" : formatDateShort(jour)}</div>
                      {info ? (
                        <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 4 }}>
                          {bateauxDuJour.map(b => (
                            <div key={b.id} style={{ width: 6, height: 6, borderRadius: "50%", background: b.color }} />
                          ))}
                        </div>
                      ) : (
                        <div style={{ height: 10 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {repasJour.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,170,0,0.07)", border: "1px solid rgba(255,170,0,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#ffaa00" }}>🍽️ {repasJour.reduce((a, b) => a + b.totaux.poisson + b.totaux.poulet + b.totaux.autre, 0)} repas ce jour</span>
                <button onClick={() => ouvrirRecap(dateSel)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(255,170,0,0.2)", color: "#ffaa00", fontSize: 13, fontWeight: 700 }}>Générer messages</button>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {BATEAUX.map(bateau => {
                const occup = placesOccupees(bateau.id, dateSel);
                const dispo = CAPACITE - occup;
                const repasB = repasJour.find(b => b.bateau.id === bateau.id);
                const skipper = getSkipper(bateau.id, dateSel, skippersJour);
                const destVerrou = getDestinationVerrouillee(reservations, bateau.id, dateSel);
                const destNom = destVerrou ? DESTINATIONS.find(d => d.id === destVerrou)?.nom : null;
                const stops = getStopsEmbarquement(resJour, bateau.id, dateSel);

                return (
                  <div key={bateau.id} style={{ ...cardSt, border: `1px solid ${bateau.colorBorder}`, borderTop: `3px solid ${bateau.color}` }}>

                    {/* En-tête bateau */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: bateau.color }}>{bateau.nom}</div>
                        <div style={{ fontSize: 11, color: "#5b8db8", marginTop: 2 }}>{bateau.details}</div>
                      </div>
                      <div style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: dispo === 0 ? "rgba(255,68,68,0.15)" : dispo <= 4 ? "rgba(255,170,0,0.15)" : bateau.colorBg, color: dispo === 0 ? "#ff4444" : dispo <= 4 ? "#ffaa00" : bateau.color }}>
                        {dispo === 0 ? "Complet" : `${dispo} pl. dispo`}
                      </div>
                    </div>

                    {/* Destination */}
                    {destNom && <div style={{ fontSize: 12, color: bateau.color, background: bateau.colorBg, borderRadius: 8, padding: "5px 10px", marginBottom: 10 }}>🗺️ {destNom}</div>}

                    {/* Skipper */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: bateau.colorBg, border: `1px solid ${bateau.colorBorder}`, borderRadius: 8, padding: "7px 10px", marginBottom: 10 }}>
                      <div style={{ fontSize: 12 }}>⚓ <span style={{ fontWeight: 600, color: bateau.color }}>{skipper?.nom}</span></div>
                      <button onClick={() => setSkipperModal({ bateauId: bateau.id, date: dateSel })} style={{ fontSize: 11, color: "#5b8db8", background: "transparent", border: "none", cursor: "pointer" }}>changer</button>
                    </div>

                    {/* Barre capacité */}
                    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, marginBottom: 8 }}>
                      <div style={{ width: `${(occup / CAPACITE) * 100}%`, height: "100%", borderRadius: 4, background: dispo === 0 ? "#ff4444" : dispo <= 4 ? "#ffaa00" : bateau.color, transition: "width 0.4s" }} />
                    </div>
                    <div style={{ fontSize: 12, color: "#5b8db8", marginBottom: 12 }}>{occup}/{CAPACITE} passagers</div>

                    {/* Repas */}
                    {repasB && (
                      <div style={{ background: "rgba(255,170,0,0.06)", border: "1px solid rgba(255,170,0,0.12)", borderRadius: 8, padding: "7px 10px", marginBottom: 12, display: "flex", gap: 12, fontSize: 12 }}>
                        {repasB.totaux.poisson > 0 && <span>🐟 ×{repasB.totaux.poisson}</span>}
                        {repasB.totaux.poulet > 0 && <span>🍗 ×{repasB.totaux.poulet}</span>}
                        {repasB.totaux.autre > 0 && <span style={{ color: "#ffaa00" }}>⚠️ ×{repasB.totaux.autre}</span>}
                      </div>
                    )}

                    {/* Stops d'embarquement */}
                    {stops.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        {stops.map((stop, idx) => {
                          const paxStop = stop.reservations.reduce((a, r) => a + (r.privatif ? CAPACITE : r.pax), 0);
                          return (
                            <div key={stop.depart.id} style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 11, color: "#5b8db8", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ width: 18, height: 18, borderRadius: "50%", background: bateau.colorBg, border: `1px solid ${bateau.colorBorder}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: bateau.color, fontWeight: 700 }}>{idx + 1}</span>
                                <span style={{ color: bateau.color, fontWeight: 600 }}>{stop.depart.nom_court}</span>
                                <span>RDV {stop.depart.heure_rdv} • {paxStop} pax</span>
                              </div>
                              {stop.reservations.map(r => {
                                const sp = getStatutPaiementLabel(r.statut_paiement);
                                return (
                                  <div key={r.id} onClick={() => setDetail(r)} style={{ background: bateau.colorBg, border: `1px solid ${bateau.colorBorder}`, borderRadius: 10, padding: "9px 12px", marginBottom: 6, cursor: "pointer", marginLeft: 24 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.client}</div>
                                      <div style={{ fontSize: 11, color: sp.color, fontWeight: 600 }}>{sp.label}</div>
                                    </div>
                                    <div style={{ fontSize: 11, color: "#5b8db8", marginTop: 2 }}>{r.privatif ? "Privatif" : `${r.pax} pax`} • {r.vendeur || r.agence_nom}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {dispo > 0 && <button onClick={() => ouvrirForm(bateau.id, dateSel)} style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px dashed ${bateau.colorBorder}`, background: "transparent", color: bateau.color, cursor: "pointer", fontSize: 13, marginTop: 4 }}>+ Ajouter réservation</button>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PAIEMENTS ── */}
        {vue === "paiements" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>💰 Suivi des paiements</h2>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#ff6644", marginBottom: 12 }}>🔴 Soldes à encaisser ({soldesDus.length}) — {totalSoldesDus.toLocaleString("fr-FR")} €</div>
              {soldesDus.length === 0 && <div style={{ color: "#5b8db8", fontSize: 13 }}>Aucun solde en attente 👍</div>}
              {soldesDus.map(r => {
                const mt = calcMontant(r.pax, r.destination, r.privatif);
                const solde = mt - r.acompte_montant;
                const dest = DESTINATIONS.find(d => d.id === r.destination);
                const bat = BATEAUX.find(b => b.id === r.bateau);
                return (
                  <div key={r.id} style={{ ...cardSt, marginBottom: 10, borderLeft: `3px solid ${bat?.color}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 16, alignItems: "center" }}>
                    <div><div style={{ fontWeight: 700 }}>{r.client}</div><div style={{ fontSize: 12, color: "#5b8db8" }}>{r.vendeur}</div></div>
                    <div><div style={{ fontSize: 13 }}>{formatDateShort(r.date)}</div><div style={{ fontSize: 12 }}><span style={{ color: bat?.color, fontWeight: 600 }}>{bat?.nom}</span><span style={{ color: "#5b8db8" }}> • {dest?.nom}</span></div></div>
                    <div><div style={{ fontSize: 12, color: "#5b8db8" }}>Total : {mt.toLocaleString("fr-FR")} €</div><div style={{ fontSize: 16, fontWeight: 700, color: "#ff6644" }}>Solde : {solde.toLocaleString("fr-FR")} €</div></div>
                    <button onClick={() => ouvrirPaiement(r)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(0,204,136,0.15)", color: "#00cc88", fontSize: 12, fontWeight: 700 }}>Encaisser ✓</button>
                  </div>
                );
              })}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#5b8db8", marginBottom: 12 }}>Toutes les réservations</div>
              {resActives.sort((a, b) => a.date.localeCompare(b.date)).map(r => {
                const mt = calcMontant(r.pax, r.destination, r.privatif);
                const dest = DESTINATIONS.find(d => d.id === r.destination);
                const bat = BATEAUX.find(b => b.id === r.bateau);
                const dep = DEPARTS.find(d => d.id === r.depart);
                const sp = getStatutPaiementLabel(r.statut_paiement);
                return (
                  <div key={r.id} onClick={() => ouvrirPaiement(r)} style={{ ...cardSt, marginBottom: 8, cursor: "pointer", borderLeft: `3px solid ${bat?.color}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 16, alignItems: "center" }}>
                    <div><div style={{ fontWeight: 700 }}>{r.client}</div><div style={{ fontSize: 12, color: "#5b8db8" }}>{r.vendeur || r.agence_nom}</div><div style={{ fontSize: 11, color: "#5b8db8" }}>{TYPE_VENDEUR.find(t => t.id === r.type_vendeur)?.nom}</div></div>
                    <div><div style={{ fontSize: 13 }}>{formatDateShort(r.date)}</div><div style={{ fontSize: 12 }}><span style={{ color: bat?.color, fontWeight: 600 }}>{bat?.nom}</span><span style={{ color: "#5b8db8" }}> • {dest?.nom}</span></div><div style={{ fontSize: 11, color: "#5b8db8" }}>{dep?.nom_court}</div></div>
                    <div><div style={{ fontSize: 16, fontWeight: 700, color: "#00cc88" }}>{mt.toLocaleString("fr-FR")} €</div>{r.encaisseur_solde && <div style={{ fontSize: 11, color: "#5b8db8" }}>par {r.encaisseur_solde}</div>}</div>
                    <div style={{ padding: "5px 10px", borderRadius: 20, background: `${sp.color}22`, color: sp.color, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{sp.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── AGENCES ── */}
        {vue === "agences" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>🏢 Facturation Agences</h2>
              <input type="month" value={moisAgence} onChange={e => setMoisAgence(e.target.value)} style={{ ...inputSt, width: "auto", padding: "6px 12px" }} />
            </div>
            {agencesUniques.length === 0 && <div style={{ color: "#5b8db8", fontSize: 13 }}>Aucune réservation agence ce mois.</div>}
            {agencesUniques.map(({ nom, res, totalBrut, commission, netDu }) => (
              <div key={nom} style={{ ...cardSt, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>🏢 {nom}</div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "#5b8db8" }}>Brut</div><div style={{ fontSize: 15, fontWeight: 700 }}>{totalBrut.toLocaleString("fr-FR")} €</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "#5b8db8" }}>Commission</div><div style={{ fontSize: 15, fontWeight: 700, color: "#ff8844" }}>- {commission.toLocaleString("fr-FR")} €</div></div>
                    <div style={{ textAlign: "right", background: "rgba(0,204,136,0.1)", border: "1px solid rgba(0,204,136,0.2)", borderRadius: 10, padding: "8px 14px" }}>
                      <div style={{ fontSize: 11, color: "#5b8db8" }}>Net à facturer</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#00cc88" }}>{netDu.toLocaleString("fr-FR")} €</div>
                    </div>
                  </div>
                </div>
                {res.map(r => {
                  const mt = calcMontant(r.pax, r.destination, r.privatif);
                  const dest = DESTINATIONS.find(d => d.id === r.destination);
                  const bat = BATEAUX.find(b => b.id === r.bateau);
                  const sp = getStatutPaiementLabel(r.statut_paiement);
                  return (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                      <div><span style={{ fontWeight: 600 }}>{r.client}</span><span style={{ color: "#5b8db8", marginLeft: 8 }}>{formatDateShort(r.date)} • </span><span style={{ color: bat?.color, fontWeight: 600 }}>{bat?.nom}</span><span style={{ color: "#5b8db8" }}> • {dest?.nom} • {r.pax} pax</span></div>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ color: "#5b8db8" }}>{mt.toLocaleString("fr-FR")} € — comm. {Math.round(mt * 0.2).toLocaleString("fr-FR")} €</span>
                        <span style={{ padding: "3px 8px", borderRadius: 12, background: `${sp.color}22`, color: sp.color, fontSize: 11, fontWeight: 700 }}>{sp.label}</span>
                        <button onClick={() => mettreAJourPaiement(r.id, { statut_paiement: r.statut_paiement === "facturation_en_cours" ? "facture_envoyee" : "paye" })} style={{ padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(0,180,255,0.12)", color: "#00b4ff", fontSize: 11, fontWeight: 700 }}>
                          {r.statut_paiement === "facturation_en_cours" ? "→ Facturée" : r.statut_paiement === "facture_envoyee" ? "→ Payée ✓" : "✓"}
                        </button>
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => {
                  const lines = [`FACTURE RÉCAPITULATIF — ${nom}`, `Mois : ${getMonthStr(moisAgence + "-01")}`, ``, ...res.map(r => { const mt = calcMontant(r.pax, r.destination, r.privatif); const dest = DESTINATIONS.find(d => d.id === r.destination); const bat = BATEAUX.find(b => b.id === r.bateau); return `${formatDateShort(r.date)} — ${r.client} — ${bat?.nom} — ${dest?.nom} — ${r.pax} pax — ${mt.toLocaleString("fr-FR")} €`; }), ``, `Total brut : ${totalBrut.toLocaleString("fr-FR")} €`, `Commission (20%) : - ${commission.toLocaleString("fr-FR")} €`, `NET À RÉGLER : ${netDu.toLocaleString("fr-FR")} €`, ``, `Atmosphere — Gestion Navettes`];
                  copier(lines.join("\n"), `ag_${nom}`);
                }} style={{ marginTop: 14, padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", background: copied === `ag_${nom}` ? "rgba(0,204,136,0.2)" : "rgba(0,180,255,0.1)", color: copied === `ag_${nom}` ? "#00cc88" : "#00b4ff", fontSize: 13, fontWeight: 700 }}>
                  {copied === `ag_${nom}` ? "✓ Copié !" : "📋 Copier récap WhatsApp"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── RÉSERVATIONS ── */}
        {vue === "reservations" && (
          <div>
            <div style={{ marginBottom: 16, fontSize: 14, color: "#5b8db8" }}>{resActives.length} réservations actives</div>
            {resActives.sort((a, b) => a.date.localeCompare(b.date)).map(r => {
              const dest = DESTINATIONS.find(d => d.id === r.destination);
              const dep = DEPARTS.find(d => d.id === r.depart);
              const bat = BATEAUX.find(b => b.id === r.bateau);
              const mt = calcMontant(r.pax, r.destination, r.privatif);
              const sp = getStatutPaiementLabel(r.statut_paiement);
              return (
                <div key={r.id} onClick={() => setDetail(r)} style={{ ...cardSt, marginBottom: 10, cursor: "pointer", borderLeft: `3px solid ${bat?.color}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 16, alignItems: "center" }}>
                  <div><div style={{ fontWeight: 700 }}>{r.client}</div><div style={{ fontSize: 12, color: "#5b8db8" }}>{r.contact}</div><div style={{ fontSize: 12, color: "#00b4ff" }}>{r.vendeur || r.agence_nom}</div></div>
                  <div><div style={{ fontSize: 13, fontWeight: 600 }}>{formatDateShort(r.date)}</div><div style={{ fontSize: 12 }}><span style={{ color: bat?.color, fontWeight: 600 }}>{bat?.nom}</span><span style={{ color: "#5b8db8" }}> • {dest?.nom}</span></div><div style={{ fontSize: 11, color: "#5b8db8" }}>{dep?.nom_court} — RDV {dep?.heure_rdv}</div></div>
                  <div><div style={{ fontSize: 16, fontWeight: 700, color: "#00cc88" }}>{mt.toLocaleString("fr-FR")} €</div><div style={{ fontSize: 12, color: "#5b8db8" }}>{r.privatif ? "Privatif" : `${r.pax} pax`}</div></div>
                  <div style={{ padding: "5px 10px", borderRadius: 20, background: `${sp.color}22`, color: sp.color, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{sp.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FORMULAIRE ── */}
      {vue === "nouvelle" && form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", overflowY: "auto", zIndex: 150, padding: 24 }}>
          <div style={{ maxWidth: 540, margin: "0 auto" }}>
            <div style={{ marginBottom: 20 }}>
              <button onClick={() => { setVue("planning"); setForm(null); }} style={{ background: "transparent", border: "none", color: "#5b8db8", cursor: "pointer", fontSize: 14 }}>← Retour</button>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Nouvelle réservation</h2>
                {form && (() => { const b = BATEAUX.find(x => x.id === form.bateau); return b ? <span style={{ padding: "4px 14px", borderRadius: 20, background: b.colorBg, border: `1px solid ${b.colorBorder}`, color: b.color, fontSize: 14, fontWeight: 700 }}>{b.nom}</span> : null; })()}
              </div>
            </div>
            {(() => {
              const bCoul = BATEAUX.find(b => b.id === form.bateau) || BATEAUX[0];
              return (
            <div style={{ ...cardSt, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 14, borderTop: `3px solid ${bCoul.color}`, borderColor: bCoul.colorBorder }}>

              {/* Bateau & Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelSt}>BATEAU</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {BATEAUX.map(b => (
                      <button key={b.id} onClick={() => { const dest = getDestinationVerrouillee(reservations, b.id, form.date); setForm({ ...form, bateau: b.id, destination: dest || form.destination }); }} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, border: `2px solid`, cursor: "pointer", borderColor: form.bateau === b.id ? b.color : "rgba(255,255,255,0.08)", background: form.bateau === b.id ? b.colorBg : "transparent", color: form.bateau === b.id ? b.color : "#5b8db8", fontSize: 11, fontWeight: 700 }}>{b.nom}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelSt}>DATE</label>
                  <input type="date" value={form.date}
                    min={(() => { const { total } = getHeureGP(); const d = new Date(); return total >= 450 ? getDateStrGP(new Date(d.getTime() + 24*60*60*1000)) : getDateStrGP(d); })()}
                    onChange={e => {
                      if (!estDateAutorisee(e.target.value)) return;
                      const dest = getDestinationVerrouillee(reservations, form.bateau, e.target.value);
                      setForm({ ...form, date: e.target.value, destination: dest || form.destination });
                    }} style={inputSt} />
                  {form.date === today && <div style={{ fontSize: 11, color: "#ffaa00", marginTop: 4 }}>⚠️ Inscription jour même — avant 7h30 uniquement</div>}
                </div>
              </div>

              {/* Destination */}
              <div>
                <label style={labelSt}>DESTINATION {destVerrouillee && <span style={{ color: "#3a6a8a", fontWeight: 400 }}>— verrouillée</span>}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {DESTINATIONS.map(d => (
                    <button key={d.id} disabled={!!destVerrouillee && destVerrouillee !== d.id} onClick={() => !destVerrouillee && setForm({ ...form, destination: d.id })} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, border: "1px solid", cursor: destVerrouillee ? "default" : "pointer", borderColor: form.destination === d.id ? bCoul.color : "rgba(255,255,255,0.08)", background: form.destination === d.id ? bCoul.colorBg : destVerrouillee && destVerrouillee !== d.id ? "rgba(255,255,255,0.02)" : "transparent", color: form.destination === d.id ? bCoul.color : destVerrouillee && destVerrouillee !== d.id ? "#2a3a4a" : "#5b8db8", fontSize: 11, fontWeight: 600 }}>
                      {d.nom.split(" ").slice(0, 2).join(" ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Point d'embarquement */}
              <div>
                <label style={labelSt}>POINT D'EMBARQUEMENT</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {DEPARTS.map(d => (
                    <button key={d.id} onClick={() => setForm({ ...form, depart: d.id, retour: d.id })} style={{ flex: 1, padding: "12px 8px", borderRadius: 10, border: "1px solid", cursor: "pointer", borderColor: form.depart === d.id ? bCoul.color : "rgba(255,255,255,0.08)", background: form.depart === d.id ? bCoul.colorBg : "transparent", color: form.depart === d.id ? bCoul.color : "#5b8db8", fontSize: 12, fontWeight: 600, textAlign: "center" }}>
                      <div>{d.nom_court}</div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>RDV {d.heure_rdv}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Point de retour — si différent */}
              <div>
                <label style={labelSt}>POINT DE RETOUR <span style={{ color: "#3a6a8a", fontWeight: 400 }}>(si différent du départ)</span></label>
                <div style={{ display: "flex", gap: 8 }}>
                  {DEPARTS.map(d => (
                    <button key={d.id} onClick={() => setForm({ ...form, retour: d.id })} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: "1px solid", cursor: "pointer", borderColor: form.retour === d.id ? bCoul.color : "rgba(255,255,255,0.08)", background: form.retour === d.id ? bCoul.colorBg : "transparent", color: form.retour === d.id ? bCoul.color : "#5b8db8", fontSize: 12, fontWeight: 600 }}>
                      <div>{d.nom_court}</div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{d.heure_retour}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <label style={labelSt}>TYPE</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[false, true].map(priv => <button key={String(priv)} onClick={() => setForm({ ...form, privatif: priv })} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid", cursor: "pointer", borderColor: form.privatif === priv ? bCoul.color : "rgba(255,255,255,0.1)", background: form.privatif === priv ? bCoul.colorBg : "transparent", color: form.privatif === priv ? bCoul.color : "#5b8db8", fontSize: 13, fontWeight: 600 }}>{priv ? "🚢 Privatif (12 pax)" : "🎫 Billetterie"}</button>)}
                </div>
              </div>

              {/* Passagers */}
              {!form.privatif && (
                <div>
                  <label style={labelSt}>NOMBRE DE PERSONNES <span style={{ color: dispoForm <= 3 ? "#ff6644" : "#3a6a8a" }}>({dispoForm} place{dispoForm > 1 ? "s" : ""} dispo)</span></label>
                  <Counter value={form.pax} min={1} max={dispoForm} onChange={v => setForm({ ...form, pax: v })} label="Personnes" color={bCoul.color} />
                </div>
              )}

              {/* Repas */}
              <div style={{ padding: depasRepas ? 10 : 0, borderRadius: 10, border: depasRepas ? "2px solid #ff4444" : "none", background: depasRepas ? "rgba(255,68,68,0.06)" : "transparent" }}>
                <label style={{ ...labelSt, color: depasRepas ? "#ff4444" : "#5b8db8" }}>REPAS {depasRepas ? "⚠️ Trop de repas !" : ""} <span style={{ color: repasRestants < 0 ? "#ff4444" : "#3a6a8a" }}>{totalRepasForm}/{paxForm} attribués{repasRestants > 0 ? ` — ${repasRestants} restant${repasRestants > 1 ? "s" : ""}` : repasRestants === 0 && paxForm > 0 ? " ✓" : ""}</span></label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {form.repas.map((r, i) => {
                    const autresRepas = form.repas.reduce((a, x, j) => j !== i ? a + x.nb : a, 0);
                    const opt = REPAS_OPTIONS.find(o => o.id === r.type);
                    return (
                      <Counter key={r.type} value={r.nb} min={0} max={paxForm - autresRepas}
                        onChange={v => { const rep = [...form.repas]; rep[i] = { ...rep[i], nb: v }; setForm({ ...form, repas: rep }); }}
                        label={`${opt.emoji} ${opt.nom}`}
                        color={r.type === "autre" ? "#ffaa00" : "#e8edf5"} />
                    );
                  })}
                </div>
                {form.repas.find(r => r.type === "autre")?.nb > 0 && (
                  <input type="text" value={form.repas_detail} placeholder="Précisez les spécificités..." onChange={e => setForm({ ...form, repas_detail: e.target.value })} style={{ ...inputSt, marginTop: 8 }} />
                )}
              </div>

              {/* Client & Contact */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={labelSt}>NOM CLIENT / GROUPE</label><input type="text" value={form.client} placeholder="Nom..." onChange={e => setForm({ ...form, client: e.target.value })} style={inputSt} /></div>
                <div>
  <label style={labelSt}>CONTACT</label>
  <input type="tel" inputMode="numeric" value={form.contact}
    placeholder="0690 00 00 00"
    onChange={e => setForm({ ...form, contact: e.target.value })}
    style={inputSt} />
</div>
              </div>

              {/* Vendeur — compact sur une ligne */}
              <div>
                <label style={labelSt}>QUI VEND ?</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {/* Type vendeur */}
                  <select value={form.type_vendeur}
                    onChange={e => setForm({ ...form, type_vendeur: e.target.value, vendeur: "", agence_nom: "",
                      statut_paiement: e.target.value === "agence" ? "facturation_en_cours" : e.target.value === "commercial" ? "commission_gardee" : "acompte_recu" })}
                    style={{ ...inputSt, borderColor: bCoul.colorBorder }}>
                    {TYPE_VENDEUR.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                  </select>
                  {/* Nom vendeur */}
                  <select value={form.vendeur}
                    onChange={e => setForm({ ...form, vendeur: e.target.value, agence_nom: form.type_vendeur === "agence" ? e.target.value : form.agence_nom })}
                    style={{ ...inputSt, borderColor: bCoul.colorBorder }}>
                    <option value="">— Qui ?</option>
                    {(VENDEURS[form.type_vendeur] || []).map(v => <option key={v.id} value={v.nom}>{v.nom}</option>)}
                  </select>
                </div>
              </div>

              {/* PAIEMENT GUIDÉ */}
              {form.type_vendeur !== "agence" && (() => {
                const totalEnc = (form.encaissements || []).reduce((a, e) => a + e.montant, 0);
                const resteAEnc = montant - totalEnc;
                const estSolde = totalEnc >= montant;
                const aUnSoldeARegler = (form.encaissements || []).some(e => e.mode === "solde_jour");
                return (
                  <div style={{ background: "rgba(255,255,255,0.03)", border: totalEnc > montant ? "2px solid #ff4444" : `1px solid ${bCoul.colorBorder}`, borderRadius: 12, padding: 16 }}>

                    {/* Titre + progression */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: 13, color: totalEnc > montant ? "#ff4444" : bCoul.color, fontWeight: 700 }}>PAIEMENT {totalEnc > montant ? "⚠️" : ""}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: totalEnc > montant ? "#ff4444" : estSolde ? "#00cc88" : resteAEnc > 0 ? "#ffaa00" : "#00cc88" }}>
                        {totalEnc} € / {montant} € {totalEnc > montant ? "— TROP ENCAISSÉ !" : estSolde ? "✓ Soldé" : `— Reste ${resteAEnc} €`}
                      </div>
                    </div>

                    {/* Alerte dépassement */}
                    {totalEnc > montant && (
                      <div style={{ background: "rgba(255,68,68,0.12)", border: "1px solid rgba(255,68,68,0.4)", borderRadius: 10, padding: "10px 12px", marginBottom: 10, fontSize: 13, color: "#ff4444", fontWeight: 700, textAlign: "center" }}>
                        ⚠️ Attention — vous avez encaissé {totalEnc} € pour une réservation de {montant} € !
                        <div style={{ fontSize: 12, fontWeight: 400, marginTop: 4, color: "#ff8888" }}>Trop encaissé : {totalEnc - montant} € — supprimez un paiement pour corriger</div>
                      </div>
                    )}

                    {/* Barre de progression */}
                    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, marginBottom: 14 }}>
                      <div style={{ width: `${Math.min(100, (totalEnc/montant)*100)}%`, height: "100%", borderRadius: 4, background: totalEnc > montant ? "#ff4444" : estSolde ? "#00cc88" : bCoul.color, transition: "width 0.3s" }} />
                    </div>

                    {/* Encaissements déjà saisis */}
                    {(form.encaissements || []).map((e, i) => {
                      const mod = e.mode === "solde_jour"
                        ? { emoji: "📋", nom: "Solde à régler le jour J" }
                        : MODES_PAIEMENT.find(m => m.id === e.mode);
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: bCoul.colorBg, border: `1px solid ${bCoul.colorBorder}`, borderRadius: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 13 }}>{mod?.emoji} {mod?.nom}</span>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: e.mode === "solde_jour" ? "#ffaa00" : "#00cc88" }}>{e.montant} €</span>
                            <button onClick={() => setForm({ ...form, encaissements: (form.encaissements || []).filter((_, j) => j !== i) })}
                              style={{ background: "transparent", border: "none", color: "#ff4444", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Zone saisie — visible si pas encore soldé et pas de solde jour */}
                    {!estSolde && !aUnSoldeARegler && (
                      <div style={{ marginTop: 10 }}>

                        {/* Type de règlement */}
                        <div style={{ marginBottom: 12 }}>
                          <label style={labelSt}>TYPE DE RÈGLEMENT</label>
                          <div style={{ display: "flex", gap: 8 }}>
                            {TYPES_REGLEMENT.map(t => (
                              <button key={t.id} onClick={() => setForm({ ...form, type_reglement: t.id })}
                                style={{ flex: 1, padding: "10px 6px", borderRadius: 10, border: "1px solid", cursor: "pointer", fontSize: 12, fontWeight: 600, textAlign: "center",
                                  borderColor: form.type_reglement === t.id ? bCoul.color : "rgba(255,255,255,0.1)",
                                  background: form.type_reglement === t.id ? bCoul.colorBg : "transparent",
                                  color: form.type_reglement === t.id ? bCoul.color : "#5b8db8" }}>
                                <div style={{ fontSize: 16, marginBottom: 2 }}>{t.emoji}</div>
                                <div>{t.nom}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Si lien de paiement — pas de saisie */}
                        {form.type_reglement === "lien" && (
                          <div style={{ padding: "12px", background: "rgba(0,180,255,0.08)", border: "1px solid rgba(0,180,255,0.2)", borderRadius: 10, fontSize: 13, color: "#00b4ff", textAlign: "center" }}>
                            🔗 Un lien de paiement sera envoyé au client
                          </div>
                        )}

                        {/* Si comptant ou acompte — saisie montant + moyen */}
                        {(form.type_reglement === "comptant" || form.type_reglement === "acompte") && (
                          <div>
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr auto", gap: 8, alignItems: "flex-end", marginBottom: 8 }}>
                              <div>
                                <label style={labelSt}>
                                  {form.type_reglement === "acompte" ? "ACOMPTE €" : "MONTANT €"}
                                </label>
                                <input type="number" inputMode="numeric"
                                  value={form._encMontant || ""}
                                  placeholder={form.type_reglement === "acompte" ? String(Math.round(montant * 0.2)) : String(resteAEnc)}
                                  onChange={e => setForm({ ...form, _encMontant: parseFloat(e.target.value) || 0 })}
                                  style={{ ...inputSt, fontSize: 15, fontWeight: 700, textAlign: "center" }} />
                              </div>
                              <div>
                                <label style={labelSt}>MOYEN</label>
                                <select value={form.mode_paiement_initial}
                                  onChange={e => setForm({ ...form, mode_paiement_initial: e.target.value })}
                                  style={inputSt}>
                                  {MODES_PAIEMENT.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.nom}</option>)}
                                </select>
                              </div>
                              <button onClick={() => {
                                const mt = form._encMontant || (form.type_reglement === "acompte" ? Math.round(montant * 0.2) : resteAEnc);
                                if (mt <= 0) return;
                                const mod = MODES_PAIEMENT.find(m => m.id === form.mode_paiement_initial);
                                const newEnc = { montant: mt, mode: form.mode_paiement_initial, modeNom: mod?.nom, modeEmoji: mod?.emoji, typeReglement: form.type_reglement, encaisseur: form.vendeur };
                                setForm({ ...form, encaissements: [...(form.encaissements || []), newEnc], _encMontant: 0 });
                              }} style={{ width: 44, height: 44, borderRadius: 10, border: "none", background: bCoul.colorBg, color: bCoul.color, cursor: "pointer", fontSize: 20, fontWeight: 700, marginTop: 18 }}>✓</button>
                            </div>

                            {/* Solde à régler le jour J si acompte */}
                            {resteAEnc > 0 && (form.encaissements || []).length > 0 && (
                              <button onClick={() => {
                                const newEnc = { montant: resteAEnc, mode: "solde_jour", modeNom: "Solde à régler le jour J", modeEmoji: "📋", typeReglement: "acompte", encaisseur: form.vendeur };
                                setForm({ ...form, encaissements: [...(form.encaissements || []), newEnc], _encMontant: 0 });
                              }} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px dashed #ffaa00", background: "rgba(255,170,0,0.06)", color: "#ffaa00", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                📋 Solde de {resteAEnc} € à régler le jour J
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message si solde à régler */}
                    {aUnSoldeARegler && !estSolde && (
                      <div style={{ marginTop: 8, padding: "10px 12px", background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.2)", borderRadius: 8, fontSize: 12, color: "#ffaa00" }}>
                        📋 Un solde de {resteAEnc} € sera encaissé le jour du départ
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Montant */}
              <div style={{ background: bCoul.colorBg, border: `1px solid ${bCoul.colorBorder}`, borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontSize: 12, color: "#5b8db8" }}>MONTANT TOTAL</div><div style={{ fontSize: 24, fontWeight: 700, color: "#00cc88" }}>{montant.toLocaleString("fr-FR")} €</div></div>
                <div style={{ textAlign: "right" }}>
                  {form.type_vendeur === "employe" && <><div style={{ fontSize: 12, color: "#5b8db8" }}>ACOMPTE (20%)</div><div style={{ fontSize: 18, fontWeight: 700, color: "#ffaa00" }}>{acompte.toLocaleString("fr-FR")} €</div></>}
                  {form.type_vendeur === "commercial" && (() => { const comm = getCommission("commercial", form.vendeur); const commMt = Math.round(montant * comm / 100); return <><div style={{ fontSize: 12, color: "#5b8db8" }}>COMMISSION {comm}%</div><div style={{ fontSize: 18, fontWeight: 700, color: "#ff8844" }}>{commMt.toLocaleString("fr-FR")} €</div><div style={{ fontSize: 12, color: "#5b8db8" }}>Solde : {(montant - commMt).toLocaleString("fr-FR")} €</div></>; })()}
                  {form.type_vendeur === "agence" && (() => { const comm = getCommission("agence", form.vendeur); const commMt = Math.round(montant * comm / 100); return <><div style={{ fontSize: 12, color: "#5b8db8" }}>COMMISSION {comm}%</div><div style={{ fontSize: 18, fontWeight: 700, color: "#ff8844" }}>{commMt.toLocaleString("fr-FR")} €</div><div style={{ fontSize: 12, color: "#00cc88" }}>Net : {(montant - commMt).toLocaleString("fr-FR")} €</div></>; })()}
                </div>
              </div>

              <button onClick={sauvegarder} disabled={!formValide || tropEncaisse} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: tropEncaisse ? "rgba(255,68,68,0.15)" : !formValide ? "rgba(255,255,255,0.08)" : `linear-gradient(135deg,${bCoul.color},${bCoul.color}99)`, color: formValide && !tropEncaisse ? "white" : tropEncaisse ? "#ff4444" : "#5b8db8", cursor: formValide ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700 }}>
                Confirmer la réservation
              </button>
            </div>
              )})()}
          </div>
        </div>
      )}

      {/* MODAL PAIEMENT */}
      {paiementModal && (() => {
        const r = paiementModal;
        const mt = calcMontant(r.pax, r.destination, r.privatif);
        const totalEncaisse = (r.encaissements || []).reduce((a, e) => a + e.montant, 0);
        const soldeRestant = mt - totalEncaisse;
        const bat = BATEAUX.find(b => b.id === r.bateau);
        return (
          <div onClick={() => setPaiementModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24, overflowY: "auto" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0d1b2e", border: `1px solid ${bat?.colorBorder}`, borderTop: `3px solid ${bat?.color}`, borderRadius: 20, padding: 28, maxWidth: 480, width: "100%", margin: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: bat?.color, fontWeight: 700, marginBottom: 2 }}>{bat?.nom}</div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>💰 {r.client}</h3>
                  <div style={{ fontSize: 12, color: "#5b8db8", marginTop: 2 }}>{formatDateShort(r.date)} • {r.pax} pax • {r.vendeur || r.agence_nom}</div>
                </div>
                <button onClick={() => setPaiementModal(null)} style={{ background: "transparent", border: "none", color: "#5b8db8", cursor: "pointer", fontSize: 20 }}>×</button>
              </div>

              {/* Résumé financier */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#5b8db8" }}>Total</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{mt.toLocaleString("fr-FR")} €</div>
                </div>
                <div style={{ background: "rgba(0,204,136,0.08)", borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#5b8db8" }}>Encaissé</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#00cc88" }}>{totalEncaisse.toLocaleString("fr-FR")} €</div>
                </div>
                <div style={{ background: soldeRestant <= 0 ? "rgba(0,204,136,0.08)" : "rgba(255,68,68,0.08)", borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#5b8db8" }}>Solde</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: soldeRestant <= 0 ? "#00cc88" : "#ff6644" }}>{soldeRestant <= 0 ? "Soldé ✓" : soldeRestant.toLocaleString("fr-FR") + " €"}</div>
                </div>
              </div>

              {/* Historique des encaissements */}
              {(r.encaissements || []).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: "#5b8db8", marginBottom: 8 }}>ENCAISSEMENTS</div>
                  {(r.encaissements || []).map((e, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(0,204,136,0.06)", border: "1px solid rgba(0,204,136,0.15)", borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span>{e.modeEmoji || MODES_PAIEMENT.find(m => m.id === e.mode)?.emoji}</span>
                        <span style={{ fontWeight: 600, color: "#00cc88" }}>{e.montant.toLocaleString("fr-FR")} €</span>
                        <span style={{ color: "#5b8db8" }}>{e.modeNom || MODES_PAIEMENT.find(m => m.id === e.mode)?.nom}</span>
                      </div>
                      <div style={{ color: "#5b8db8", fontSize: 11 }}>{e.encaisseur} • {e.date}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Nouvel encaissement */}
              {r.type_vendeur !== "agence" && (
                <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${bat?.colorBorder}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: bat?.color, fontWeight: 700 }}>+ ENCAISSEMENT</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: soldeRestant > 0 ? "#ff6644" : "#00cc88" }}>
                      {soldeRestant > 0 ? `Reste ${soldeRestant.toLocaleString("fr-FR")} €` : "Soldé ✓"}
                    </div>
                  </div>

                  {/* Montant + mode sur la même ligne */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={labelSt}>MONTANT €</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={encForm.montant}
                        min="0"
                        onChange={e => setEncForm(f => ({ ...f, montant: parseFloat(e.target.value) || 0 }))}
                        style={{ ...inputSt, fontSize: 18, fontWeight: 700, textAlign: "center" }}
                      />
                    </div>
                    <div>
                      <label style={labelSt}>MODE</label>
                      <select
                        value={encForm.mode}
                        onChange={e => setEncForm(f => ({ ...f, mode: e.target.value }))}
                        style={{ ...inputSt, fontSize: 14 }}>
                        {MODES_PAIEMENT.map(m => (
                          <option key={m.id} value={m.id}>{m.emoji} {m.nom}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Raccourcis montant */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {[soldeRestant, Math.round(soldeRestant/2), 100, 50, 20].filter(v => v > 0).filter((v,i,a) => a.indexOf(v)===i).slice(0,5).map(v => (
                      <button key={v} onClick={() => setEncForm(f => ({ ...f, montant: v }))}
                        style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${bat?.colorBorder}`, background: encForm.montant === v ? bat?.colorBg : "transparent", color: bat?.color, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        {v} €
                      </button>
                    ))}
                  </div>

                  {/* Encaisseur */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelSt}>ENCAISSÉ PAR</label>
                    <input type="text" value={encForm.encaisseur} placeholder="Nom..."
                      onChange={e => setEncForm(f => ({ ...f, encaisseur: e.target.value }))}
                      style={inputSt} />
                  </div>

                  <button
                    onClick={() => {
                      if (encForm.montant <= 0) return;
                      const modePaiement = MODES_PAIEMENT.find(m => m.id === encForm.mode);
                      const newEnc = {
                        montant: encForm.montant,
                        mode: encForm.mode,
                        modeNom: modePaiement?.nom || encForm.mode,
                        modeEmoji: modePaiement?.emoji || "",
                        encaisseur: encForm.encaisseur,
                        date: formatDateShort(today),
                      };
                      const newEncaissements = [...(r.encaissements || []), newEnc];
                      const newTotal = newEncaissements.reduce((a, e) => a + e.montant, 0);
                      const nouveauStatut = newTotal >= mt ? "solde" : "acompte_recu";
                      enregistrerEncaissement(r.id, newEncaissements, nouveauStatut);
                      setEncForm({ montant: Math.max(0, mt - newTotal), mode: "cb", encaisseur: "" });
                    }}
                    disabled={encForm.montant <= 0}
                    style={{
                      width: "100%", padding: 14, borderRadius: 10, border: "none",
                      cursor: encForm.montant > 0 ? "pointer" : "not-allowed",
                      background: encForm.montant > 0 ? `linear-gradient(135deg,${bat?.color},${bat?.color}88)` : "rgba(255,255,255,0.08)",
                      color: encForm.montant > 0 ? "white" : "#5b8db8",
                      fontSize: 15, fontWeight: 700,
                    }}>
                    ✓ Enregistrer {encForm.montant > 0 ? `${encForm.montant} € ${MODES_PAIEMENT.find(m=>m.id===encForm.mode)?.emoji}` : ""}
                  </button>
                </div>
              )}

              {/* Agence — statut facturation */}
              {r.type_vendeur === "agence" && (
                <div>
                  <label style={labelSt}>STATUT FACTURATION</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[{ id: "facturation_en_cours", label: "À facturer", col: "#ff6644" }, { id: "facture_envoyee", label: "Facture envoyée", col: "#ffaa00" }, { id: "paye", label: "Payé ✓", col: "#00cc88" }].map(s => (
                      <button key={s.id} onClick={() => mettreAJourPaiement(r.id, { statut_paiement: s.id })} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid", cursor: "pointer", textAlign: "left", borderColor: r.statut_paiement === s.id ? s.col : "rgba(255,255,255,0.1)", background: r.statut_paiement === s.id ? `${s.col}22` : "transparent", color: r.statut_paiement === s.id ? s.col : "#e8edf5", fontSize: 14, fontWeight: 600 }}>
                        {s.label} {r.statut_paiement === s.id ? "← actuel" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* MODAL SKIPPER */}
      {skipperModal && (
        <div onClick={() => setSkipperModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0d1b2e", border: "1px solid rgba(0,180,255,0.2)", borderRadius: 20, padding: 28, maxWidth: 340, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>⚓ Changer le skipper</h3>
              <button onClick={() => setSkipperModal(null)} style={{ background: "transparent", border: "none", color: "#5b8db8", cursor: "pointer", fontSize: 20 }}>×</button>
            </div>
            <div style={{ fontSize: 12, color: "#5b8db8", marginBottom: 16 }}>{BATEAUX.find(b => b.id === skipperModal.bateauId)?.nom} — {formatDateShort(skipperModal.date)}</div>
            {SKIPPERS_DEFAULT.map(s => {
              const current = getSkipper(skipperModal.bateauId, skipperModal.date, skippersJour);
              return <button key={s.id} onClick={() => changerSkipper(skipperModal.bateauId, skipperModal.date, s.id)} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid", marginBottom: 8, cursor: "pointer", textAlign: "left", borderColor: current?.id === s.id ? "#00b4ff" : "rgba(255,255,255,0.1)", background: current?.id === s.id ? "rgba(0,180,255,0.15)" : "rgba(255,255,255,0.03)", color: current?.id === s.id ? "#00b4ff" : "#e8edf5", fontSize: 14, fontWeight: 600 }}>{s.nom} {s.bateau === skipperModal.bateauId ? <span style={{ fontSize: 11, color: "#5b8db8" }}>(attitré)</span> : ""}{current?.id === s.id ? " ✓" : ""}</button>;
            })}
          </div>
        </div>
      )}

      {/* MODAL RÉCAP TRAITEUR */}
      {recapModal && (
        <div onClick={() => setRecapModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0d1b2e", border: "1px solid rgba(255,170,0,0.25)", borderRadius: 20, padding: 28, maxWidth: 680, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div><h3 style={{ margin: 0, fontSize: 18, color: "#ffaa00" }}>🍽️ Récap Traiteur & Skippers</h3><div style={{ fontSize: 12, color: "#5b8db8", marginTop: 4 }}>{formatDate(recapModal.date)}</div></div>
              <button onClick={() => setRecapModal(null)} style={{ background: "transparent", border: "none", color: "#5b8db8", cursor: "pointer", fontSize: 20 }}>×</button>
            </div>
            {recapModal.data.map(({ bateau, totaux, specificites, dest, skipper, nbPax }) => (
              <div key={bateau.id} style={{ background: bateau.colorBg, border: `1px solid ${bateau.colorBorder}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, color: bateau.color }}>🚤 {bateau.nom} <span style={{ fontSize: 12, color: "#5b8db8", fontWeight: 400 }}>⚓ {skipper?.nom}</span></div>
                  <div style={{ fontSize: 12, color: "#5b8db8" }}>{nbPax} pax • {dest?.nom}</div>
                </div>
                <div style={{ display: "flex", gap: 20 }}>
                  {totaux.poisson > 0 && <div style={{ textAlign: "center" }}><div>🐟</div><div style={{ fontSize: 18, fontWeight: 700 }}>{totaux.poisson}</div></div>}
                  {totaux.poulet > 0 && <div style={{ textAlign: "center" }}><div>🍗</div><div style={{ fontSize: 18, fontWeight: 700 }}>{totaux.poulet}</div></div>}
                  {totaux.autre > 0 && <div style={{ textAlign: "center" }}><div>⚠️</div><div style={{ fontSize: 18, fontWeight: 700, color: "#ffaa00" }}>{totaux.autre}</div></div>}
                </div>
                {specificites.length > 0 && <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(255,170,0,0.08)", borderRadius: 8 }}>{specificites.map((s, i) => <div key={i} style={{ fontSize: 12, color: "#ffaa00" }}>→ {s}</div>)}</div>}
              </div>
            ))}
            <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
              {[["🍽️ TRAITEUR", recapModal.msgTraiteur, "#ffaa00", "rt"], ...recapModal.msgsSkipper.map(({ skipper, bateau, msg }, idx) => [`⚓ ${skipper?.nom?.toUpperCase()} — ${bateau.nom}`, msg, bateau.color, `sk_${idx}`])].map(([title, msg, col, key]) => (
                <div key={key} style={{ background: "rgba(0,0,0,0.25)", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12, color: col, fontWeight: 700, marginBottom: 8 }}>{title}</div>
                  <pre style={{ fontSize: 11, color: "#c8d8e8", whiteSpace: "pre-wrap", fontFamily: "monospace", maxHeight: 150, overflowY: "auto", margin: "0 0 10px" }}>{msg}</pre>
                  <button onClick={() => copier(msg, key)} style={{ padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: copied === key ? "rgba(0,204,136,0.3)" : "rgba(37,211,102,0.15)", color: copied === key ? "#00cc88" : "#25d366", fontSize: 12, fontWeight: 700 }}>{copied === key ? "✓ Copié !" : "📋 Copier"}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAIL */}
      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0d1b2e", border: `1px solid ${BATEAUX.find(b => b.id === detail.bateau)?.colorBorder}`, borderTop: `3px solid ${BATEAUX.find(b => b.id === detail.bateau)?.color}`, borderRadius: 20, padding: 28, maxWidth: 440, width: "100%" }}>
            {(() => {
              const dest = DESTINATIONS.find(d => d.id === detail.destination);
              const dep = DEPARTS.find(d => d.id === detail.depart);
              const ret = DEPARTS.find(d => d.id === detail.retour);
              const bat = BATEAUX.find(b => b.id === detail.bateau);
              const mt = calcMontant(detail.pax, detail.destination, detail.privatif);
              const sp = getStatutPaiementLabel(detail.statut_paiement);
              const repasStr = detail.repas?.filter(x => x.nb > 0).map(x => `${REPAS_OPTIONS.find(o => o.id === x.type)?.emoji} ×${x.nb}`).join(" • ") || "—";
              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 11, color: bat?.color, fontWeight: 700, marginBottom: 4 }}>{bat?.nom}</div>
                      <h3 style={{ margin: 0, fontSize: 20 }}>{detail.client}</h3>
                    </div>
                    <button onClick={() => setDetail(null)} style={{ background: "transparent", border: "none", color: "#5b8db8", cursor: "pointer", fontSize: 20 }}>×</button>
                  </div>
                  {[
                    ["Date", formatDate(detail.date)],
                    ["Destination", dest?.nom],
                    ["Embarquement", `${dep?.nom_court} — RDV ${dep?.heure_rdv}`],
                    ["Retour", ret?.id !== dep?.id ? `${ret?.nom_court} — ${ret?.heure_retour}` : "Même point"],
                    ["Passagers", detail.privatif ? "Privatif (12 pax)" : `${detail.pax} personnes`],
                    ["Repas", repasStr],
                    detail.repas_detail ? ["Spécificités", detail.repas_detail] : null,
                    ["Contact", detail.contact],
                    ["Vendeur", detail.vendeur || detail.agence_nom],
                    detail.encaisseur_solde ? ["Encaissé par", detail.encaisseur_solde] : null,
                    ["Montant", `${mt.toLocaleString("fr-FR")} €`],
                    ["Paiement", <span style={{ color: sp.color, fontWeight: 700 }}>{sp.label}</span>],
                  ].filter(Boolean).map(([lbl, val]) => (
                    <div key={lbl} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14 }}>
                      <span style={{ color: "#5b8db8" }}>{lbl}</span>
                      <span style={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button onClick={() => { setDetail(null); ouvrirPaiement(detail); }} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(0,204,136,0.15)", color: "#00cc88", fontSize: 14, fontWeight: 600 }}>💰 Paiement</button>
                    <button onClick={() => annulerResa(detail.id)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid rgba(255,68,68,0.3)", background: "rgba(255,68,68,0.1)", color: "#ff4444", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Annuler</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
