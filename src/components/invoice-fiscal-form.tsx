"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { InvoiceDocumentType, InvoiceReceiverType } from "@prisma/client";

type InvoicePatient = {
  id: string;
  name: string;
  email: string | null;
  fiscalName: string | null;
  taxId: string | null;
  fiscalAddress: string | null;
  treatmentNeed: string | null;
  estimatedValue: number;
};

type InvoiceFiscalFormProps = {
  patients: InvoicePatient[];
  action: (formData: FormData) => void | Promise<void>;
};

export function InvoiceFiscalForm({ patients, action }: InvoiceFiscalFormProps) {
  const firstPatient = patients[0];
  const [patientId, setPatientId] = useState(firstPatient?.id ?? "");
  const selectedPatient = useMemo(
    () => patients.find(patient => patient.id === patientId) ?? firstPatient,
    [firstPatient, patientId, patients]
  );

  const [receiverType, setReceiverType] = useState<InvoiceReceiverType>("PATIENT");
  const [documentType, setDocumentType] = useState<InvoiceDocumentType>("COMPLETE");
  const [treatmentName, setTreatmentName] = useState(selectedPatient?.treatmentNeed || "Tratamiento dental");
  const [amount, setAmount] = useState(selectedPatient?.estimatedValue ? String(Math.round(selectedPatient.estimatedValue / 100)) : "0");
  const [taxRate, setTaxRate] = useState("0");
  const [dueAt, setDueAt] = useState(new Date().toISOString().slice(0, 10));
  const [receiverName, setReceiverName] = useState(selectedPatient?.fiscalName || selectedPatient?.name || "");
  const [receiverTaxId, setReceiverTaxId] = useState(selectedPatient?.taxId || "");
  const [receiverEmail, setReceiverEmail] = useState(selectedPatient?.email || "");
  const [receiverAddress, setReceiverAddress] = useState(selectedPatient?.fiscalAddress || "");
  const [taxExemptionReason, setTaxExemptionReason] = useState("");

  function applyPatient(patient: InvoicePatient | undefined) {
    if (!patient) return;
    setTreatmentName(patient.treatmentNeed || "Tratamiento dental");
    setAmount(patient.estimatedValue ? String(Math.round(patient.estimatedValue / 100)) : "0");
    setReceiverName(patient.fiscalName || patient.name);
    setReceiverTaxId(patient.taxId || "");
    setReceiverEmail(patient.email || "");
    setReceiverAddress(patient.fiscalAddress || "");
  }

  function handlePatientChange(nextPatientId: string) {
    setPatientId(nextPatientId);
    applyPatient(patients.find(patient => patient.id === nextPatientId));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (receiverType !== "PATIENT" && (!receiverName.trim() || !receiverTaxId.trim())) {
      event.preventDefault();
      window.alert("Para facturas B2B necesitas nombre fiscal y NIF/CIF del destinatario.");
    }
  }

  return (
    <form action={action} className="form-grid two" onSubmit={handleSubmit}>
      <label className="field">
        <span>Paciente<em className="required-mark">*</em></span>
        <select name="patientId" required value={patientId} onChange={event => handlePatientChange(event.target.value)}>
          {patients.map(patient => (
            <option key={patient.id} value={patient.id}>{patient.name}</option>
          ))}
        </select>
        <small>Al seleccionar paciente se cargan sus datos fiscales guardados.</small>
      </label>
      <label className="field">
        <span>Destinatario</span>
        <select name="receiverType" value={receiverType} onChange={event => setReceiverType(event.target.value as InvoiceReceiverType)}>
          <option value="PATIENT">Paciente particular</option>
          <option value="COMPANY">Empresa</option>
          <option value="PROFESSIONAL">Profesional/autonomo</option>
          <option value="INSURER">Mutua o aseguradora</option>
          <option value="PUBLIC_ADMINISTRATION">Administracion publica</option>
        </select>
      </label>
      <label className="field">
        <span>Tratamiento / concepto<em className="required-mark">*</em></span>
        <input name="treatmentName" value={treatmentName} onChange={event => setTreatmentName(event.target.value)} required />
      </label>
      <label className="field">
        <span>Importe total<em className="required-mark">*</em></span>
        <input name="amount" type="number" value={amount} onChange={event => setAmount(event.target.value)} required />
      </label>
      <label className="field">
        <span>IVA %</span>
        <input name="taxRate" type="number" value={taxRate} onChange={event => setTaxRate(event.target.value)} />
      </label>
      <label className="field">
        <span>Vencimiento<em className="required-mark">*</em></span>
        <input name="dueAt" type="date" value={dueAt} onChange={event => setDueAt(event.target.value)} required />
      </label>
      <label className="field">
        <span>Tipo de factura</span>
        <select name="documentType" value={documentType} onChange={event => setDocumentType(event.target.value as InvoiceDocumentType)}>
          <option value="COMPLETE">Completa</option>
          <option value="SIMPLIFIED">Simplificada</option>
          <option value="RECTIFYING">Rectificativa</option>
        </select>
      </label>
      <label className="field">
        <span>Nombre fiscal destinatario</span>
        <input name="receiverName" value={receiverName} onChange={event => setReceiverName(event.target.value)} />
      </label>
      <label className="field">
        <span>NIF/CIF destinatario</span>
        <input name="receiverTaxId" value={receiverTaxId} onChange={event => setReceiverTaxId(event.target.value)} />
      </label>
      <label className="field">
        <span>Email destinatario</span>
        <input name="receiverEmail" type="email" value={receiverEmail} onChange={event => setReceiverEmail(event.target.value)} />
      </label>
      <label className="field" style={{ gridColumn: "1 / -1" }}>
        <span>Direccion fiscal / notas</span>
        <textarea name="receiverAddress" value={receiverAddress} onChange={event => setReceiverAddress(event.target.value)} />
      </label>
      <label className="field" style={{ gridColumn: "1 / -1" }}>
        <span>Motivo de exencion o notas internas</span>
        <textarea name="taxExemptionReason" value={taxExemptionReason} onChange={event => setTaxExemptionReason(event.target.value)} />
      </label>
      <button className="button primary" type="submit">Emitir factura</button>
    </form>
  );
}
