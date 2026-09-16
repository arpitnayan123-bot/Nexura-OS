-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'early_access',
    "specialty" TEXT,
    "slot" TEXT,
    "reason" TEXT,
    "date" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmaCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gstin" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "drugLicense" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmaCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmaBranch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "gstin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmaBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmaStaff" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'pharmacist',
    "pinHash" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmaStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Walk-in',
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "address" TEXT,
    "dob" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "dlNumber" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "brand" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "hsn" TEXT,
    "schedule" TEXT,
    "salts" TEXT,
    "packaging" TEXT,
    "stripsPerBox" INTEGER NOT NULL DEFAULT 10,
    "tabletsPerStrip" INTEGER NOT NULL DEFAULT 10,
    "cgstRate" DOUBLE PRECISION NOT NULL DEFAULT 6.0,
    "sgstRate" DOUBLE PRECISION NOT NULL DEFAULT 6.0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBatch" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "barcode" TEXT,
    "mfgDate" TEXT NOT NULL,
    "expDate" TEXT NOT NULL,
    "mrp" DOUBLE PRECISION NOT NULL,
    "purchaseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockStrips" INTEGER NOT NULL DEFAULT 0,
    "stockLoose" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "staffId" TEXT,
    "customerId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roundOff" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payMode" TEXT NOT NULL DEFAULT 'cash',
    "status" TEXT NOT NULL DEFAULT 'billed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "qtyStrips" INTEGER NOT NULL DEFAULT 0,
    "qtyLoose" INTEGER NOT NULL DEFAULT 0,
    "mrpPerStrip" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cgstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "poNo" TEXT NOT NULL,
    "supplierInvoiceNo" TEXT,
    "branchId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "mfgDate" TEXT NOT NULL,
    "expDate" TEXT NOT NULL,
    "mrp" DOUBLE PRECISION NOT NULL,
    "purchaseRate" DOUBLE PRECISION NOT NULL,
    "qtyStrips" INTEGER NOT NULL,
    "lineTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nabhAccredited" BOOLEAN NOT NULL DEFAULT false,
    "gstin" TEXT,
    "address" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "contact" TEXT,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'standard',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,
    "tenantId" TEXT,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalPatient" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "uhid" TEXT NOT NULL,
    "abhaId" TEXT,
    "abhaProfile" TEXT,
    "fullName" TEXT NOT NULL,
    "dob" TEXT,
    "age" INTEGER,
    "gender" TEXT NOT NULL DEFAULT 'male',
    "bloodGroup" TEXT,
    "address" TEXT,
    "district" TEXT,
    "state" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "primaryLanguage" TEXT NOT NULL DEFAULT 'English',
    "insuranceProvider" TEXT,
    "insurancePolicyNo" TEXT,
    "pmjayBeneficiary" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "allergy" TEXT,
    "chronicConditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HospitalPatient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalDoctor" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regNo" TEXT,
    "specialty" TEXT NOT NULL,
    "department" TEXT,
    "consultationFee" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "availableDays" TEXT,
    "availableHours" TEXT,
    "languagesSpoken" TEXT,
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HospitalDoctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalStaff" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'nurse',
    "department" TEXT,
    "shift" TEXT,
    "employeeId" TEXT,
    "phone" TEXT,
    "joinDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HospitalStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalWard" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wardType" TEXT NOT NULL DEFAULT 'general',
    "totalBeds" INTEGER NOT NULL DEFAULT 10,
    "floorNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HospitalWard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalBed" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "bedType" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'available',
    "currentPatientUhid" TEXT,
    "lastCleanedAt" TIMESTAMP(3),
    "reservedForName" TEXT,
    "isolationReason" TEXT,
    "maintenanceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HospitalBed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalAppointment" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientUhid" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "tokenNumber" INTEGER NOT NULL DEFAULT 1,
    "appointmentType" TEXT NOT NULL DEFAULT 'opd',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "room" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "notes" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "rescheduledFromId" TEXT,
    "chiefComplaint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HospitalAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalAdmission" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientUhid" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admittingDoctorId" TEXT,
    "wardId" TEXT,
    "bedId" TEXT,
    "admissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admissionDiagnosis" TEXT,
    "admissionType" TEXT NOT NULL DEFAULT 'emergency',
    "expectedDischargeDate" TIMESTAMP(3),
    "actualDischargeDate" TIMESTAMP(3),
    "dischargeStatus" TEXT,
    "dischargeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HospitalAdmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalVital" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientUhid" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admissionId" TEXT,
    "appointmentId" TEXT,
    "recordedByStaffId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "pulseRate" INTEGER,
    "temperatureC" DOUBLE PRECISION,
    "respiratoryRate" INTEGER,
    "spo2" INTEGER,
    "bloodGlucose" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "glasgowComaScale" INTEGER,
    "news2Score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HospitalVital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalNote" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientUhid" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "appointmentId" TEXT,
    "admissionId" TEXT,
    "noteType" TEXT NOT NULL DEFAULT 'soap',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "signedAt" TIMESTAMP(3),
    "signedByName" TEXT,
    "signedByRole" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "addendumToNoteId" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "restricted" BOOLEAN NOT NULL DEFAULT false,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "fullText" TEXT,
    "dictationTranscript" TEXT,
    "aiStructured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalOrder" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientUhid" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "orderingDoctorId" TEXT,
    "admissionId" TEXT,
    "appointmentId" TEXT,
    "orderType" TEXT NOT NULL DEFAULT 'lab',
    "orderDetails" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'routine',
    "status" TEXT NOT NULL DEFAULT 'ordered',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HospitalOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "resultValue" TEXT,
    "unit" TEXT,
    "refRangeMin" DOUBLE PRECISION,
    "refRangeMax" DOUBLE PRECISION,
    "abnormalFlag" TEXT NOT NULL DEFAULT 'normal',
    "resultText" TEXT,
    "reportedByStaffId" TEXT,
    "reportedAt" TIMESTAMP(3),
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "verifiedByStaffId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "criticalNotifiedAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalMedicine" (
    "id" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "genericName" TEXT,
    "saltComposition" TEXT,
    "company" TEXT,
    "packType" TEXT,
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "nppaControlled" BOOLEAN NOT NULL DEFAULT false,
    "nppaCeilingPrice" DOUBLE PRECISION,
    "cdscoBanned" BOOLEAN NOT NULL DEFAULT false,
    "schedule" TEXT NOT NULL DEFAULT 'otc',
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HospitalMedicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalPrescription" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientUhid" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescribingDoctorId" TEXT,
    "consultationId" TEXT,
    "items" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HospitalPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalBill" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientUhid" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admissionId" TEXT,
    "appointmentId" TEXT,
    "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemizedCharges" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMode" TEXT NOT NULL DEFAULT 'cash',
    "insuranceClaimId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HospitalBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceClaim" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientUhid" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admissionId" TEXT,
    "tpaCompany" TEXT NOT NULL,
    "policyNumber" TEXT,
    "icd10Primary" TEXT,
    "icd10Secondary" TEXT,
    "plannedProcedures" TEXT,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preAuthStatus" TEXT NOT NULL DEFAULT 'draft',
    "approvedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "patientCopay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashless" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodBankUnit" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "component" TEXT NOT NULL DEFAULT 'whole_blood',
    "unitsAvailable" INTEGER NOT NULL DEFAULT 0,
    "expiryDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BloodBankUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OTSurgery" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "otRoomNumber" TEXT NOT NULL,
    "patientUhid" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "surgeonId" TEXT,
    "anesthetistId" TEXT,
    "scrubNurseId" TEXT,
    "admissionId" TEXT,
    "plannedStartTime" TIMESTAMP(3),
    "estimatedDurationMin" INTEGER,
    "actualStartTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'planned',
    "preOpChecklist" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OTSurgery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "regNo" TEXT,
    "bookingSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicDoctor" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialization" TEXT,
    "qualification" TEXT,
    "phone" TEXT,
    "feeConsult" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "shiftStart" TEXT,
    "shiftEnd" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicDoctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicPatient" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "abhaId" TEXT,
    "abhaProfile" TEXT,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL DEFAULT 'male',
    "age" INTEGER,
    "dob" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "bloodGroup" TEXT,
    "allergy" TEXT,
    "chronicDx" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicPatient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicAppointment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "slot" TIMESTAMP(3) NOT NULL,
    "tokenNo" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'booked',
    "source" TEXT NOT NULL DEFAULT 'walkin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicVisit" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "appointmentId" TEXT,
    "chiefComplaint" TEXT,
    "vitalsBP" TEXT,
    "vitalsPulse" INTEGER,
    "vitalsTemp" DOUBLE PRECISION,
    "vitalsSpo2" INTEGER,
    "vitalsRBS" INTEGER,
    "weight" DOUBLE PRECISION,
    "diagnosis" TEXT,
    "advice" TEXT,
    "followUp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicRx" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "medicine" TEXT NOT NULL,
    "dosage" TEXT,
    "duration" TEXT,
    "notes" TEXT,

    CONSTRAINT "ClinicRx_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicInvoice" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "invoiceNo" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "payMode" TEXT NOT NULL DEFAULT 'cash',
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "payMode" TEXT NOT NULL DEFAULT 'cash',
    "refNo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAccount" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPayment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "saleId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "payMode" TEXT NOT NULL DEFAULT 'cash',
    "refNo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleHEntry" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "serialNo" INTEGER NOT NULL,
    "saleId" TEXT,
    "saleItemId" TEXT,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientAddress" TEXT,
    "patientPhone" TEXT,
    "doctorName" TEXT NOT NULL,
    "doctorRegNo" TEXT NOT NULL,
    "prescriptionDate" TEXT NOT NULL,
    "prescriptionImage" TEXT,
    "medicineName" TEXT NOT NULL,
    "batchNo" TEXT,
    "qtyStrips" INTEGER NOT NULL DEFAULT 0,
    "qtyLoose" INTEGER NOT NULL DEFAULT 0,
    "schedule" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleHEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NearExpiryReturn" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "returnNo" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'Near expiry',
    "status" TEXT NOT NULL DEFAULT 'initiated',
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NearExpiryReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NearExpiryReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "expDate" TEXT NOT NULL,
    "qtyStrips" INTEGER NOT NULL,
    "mrp" DOUBLE PRECISION NOT NULL,
    "cgstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "NearExpiryReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayClosing" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "closingDate" TEXT NOT NULL,
    "cashSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "upiSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cardSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cgstCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgstCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPurchases" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invoiceCount" INTEGER NOT NULL DEFAULT 0,
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayClosing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndianDrug" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "saltName" TEXT NOT NULL,
    "strength" TEXT,
    "form" TEXT NOT NULL DEFAULT 'tablet',
    "schedule" TEXT,
    "category" TEXT,
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndianDrug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineBooking" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "doctorId" TEXT,
    "patientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "slot" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'booked',
    "convertedPatientId" TEXT,
    "convertedAppointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnlineBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "doctorId" TEXT,
    "followUpDate" TIMESTAMP(3) NOT NULL,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "rescheduleSent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectConnection" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "doctorName" TEXT NOT NULL,
    "doctorSpecialty" TEXT,
    "doctorPhone" TEXT,
    "patientId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientPhone" TEXT,
    "patientAge" INTEGER,
    "patientGender" TEXT,
    "source" TEXT NOT NULL DEFAULT 'clinic',
    "sourceRefId" TEXT,
    "lastConsultDate" TIMESTAMP(3),
    "whatsappSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappSentAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectMessage" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "fromRole" TEXT NOT NULL DEFAULT 'patient',
    "fromName" TEXT,
    "text" TEXT NOT NULL,
    "attachmentType" TEXT,
    "attachmentUrl" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectCall" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'video',
    "status" TEXT NOT NULL DEFAULT 'initiated',
    "initiatedBy" TEXT NOT NULL DEFAULT 'patient',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "prescriptionJson" TEXT,
    "prescriptionSynced" BOOLEAN NOT NULL DEFAULT false,
    "pharmacySyncId" TEXT,
    "callSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectQueue" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "requestedMode" TEXT NOT NULL DEFAULT 'chat',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickedUpAt" TIMESTAMP(3),
    "pickedUpByDoctorId" TEXT,

    CONSTRAINT "ConnectQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourismInquiry" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientEmail" TEXT,
    "patientPhone" TEXT,
    "patientCountry" TEXT NOT NULL DEFAULT 'Unknown',
    "countryCode" TEXT,
    "procedureInterest" TEXT,
    "conditionDesc" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "assignedCoordinatorId" TEXT,
    "coordinatorName" TEXT,
    "estimatedCostUSD" DOUBLE PRECISION,
    "estimatedCostINR" DOUBLE PRECISION,
    "appointmentDate" TIMESTAMP(3),
    "visaStatus" TEXT,
    "arrivalDate" TIMESTAMP(3),
    "admissionId" TEXT,
    "dischargeDate" TIMESTAMP(3),
    "outcome" TEXT,
    "totalBilledUSD" DOUBLE PRECISION,
    "messages" TEXT,
    "recordsUrl" TEXT,
    "estimateUrl" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourismInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourismProcedure" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "priceUSD" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "avgStayDays" INTEGER NOT NULL DEFAULT 7,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourismProcedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourismSetting" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "tourismReady" BOOLEAN NOT NULL DEFAULT false,
    "nabhCertUrl" TEXT,
    "jciCertUrl" TEXT,
    "internationalPhone" TEXT,
    "internationalEmail" TEXT,
    "languages" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourismSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourismCoordinator" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "staffId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "languages" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourismCoordinator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourismTestimonial" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "patientName" TEXT NOT NULL,
    "patientCountry" TEXT NOT NULL,
    "procedure" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "testimonial" TEXT NOT NULL,
    "treatmentDate" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourismTestimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyRate" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL DEFAULT 'INR',
    "rates" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrencyRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalUser" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "dob" TEXT,
    "gender" TEXT,
    "bloodGroup" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "abhaId" TEXT,
    "profilePhoto" TEXT,
    "hospitalPatientUhid" TEXT,
    "clinicPatientMrn" TEXT,
    "pharmacyCustomerId" TEXT,
    "familyHeadId" TEXT,
    "relationToHead" TEXT,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "PortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "testPanelName" TEXT NOT NULL,
    "testPanelCode" TEXT NOT NULL,
    "testsIncluded" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "phlebotomistId" TEXT,
    "phlebotomistName" TEXT,
    "phlebotomistPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'booked',
    "sampleCollectedAt" TIMESTAMP(3),
    "reportReadyAt" TIMESTAMP(3),
    "reportJson" TEXT,
    "aiInterpretation" TEXT,
    "paymentMode" TEXT NOT NULL DEFAULT 'upi',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BloodBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phlebotomist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zones" TEXT NOT NULL,
    "vehicleNo" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.8,
    "totalCollections" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "currentBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Phlebotomist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxStaffUser" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "staffCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "departmentId" TEXT,
    "speciality" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "mfaSecret" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "linkedPatientId" TEXT,
    "onDuty" BOOLEAN NOT NULL DEFAULT true,
    "shift" TEXT NOT NULL DEFAULT 'morning',
    "pinHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxStaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxTask" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "type" TEXT NOT NULL DEFAULT 'task',
    "category" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'new',
    "ownerRole" TEXT,
    "ownerName" TEXT,
    "assignedToUserId" TEXT,
    "department" TEXT,
    "patientId" TEXT,
    "patientName" TEXT,
    "patientUhid" TEXT,
    "encounterId" TEXT,
    "location" TEXT,
    "dueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completionNote" TEXT,
    "checklist" TEXT,
    "recurrence" TEXT,
    "recurrenceNext" TIMESTAMP(3),
    "handoffFrom" TEXT,
    "handoffTo" TEXT,
    "waitingReason" TEXT,
    "blockedReason" TEXT,
    "slaMinutes" INTEGER,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "escalatedAt" TIMESTAMP(3),
    "reason" TEXT,
    "sourceModule" TEXT,
    "relatedId" TEXT,
    "attachments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxIncident" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'minor',
    "status" TEXT NOT NULL DEFAULT 'open',
    "category" TEXT NOT NULL DEFAULT 'operational',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "patientId" TEXT,
    "reportedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxAuditEvent" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "patientId" TEXT,
    "detail" TEXT,
    "prevHash" TEXT,
    "hash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxOrderEvent" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorName" TEXT,
    "actorRole" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxOrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxEquipment" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "location" TEXT,
    "department" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_service',
    "lastCalibration" TIMESTAMP(3),
    "nextMaintenance" TIMESTAMP(3),
    "utilization" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxSupplyItem" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'units',
    "onHand" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 10,
    "location" TEXT,
    "batchNo" TEXT,
    "expiryDate" TIMESTAMP(3),
    "supplier" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxSupplyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxMessage" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "channelKey" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "senderUserId" TEXT,
    "body" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'normal',
    "mentions" TEXT,
    "attachments" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "patientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxAutomationRule" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" TEXT,
    "conditions" TEXT,
    "actions" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxAutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxWorkflowRun" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "ruleId" TEXT,
    "ruleName" TEXT NOT NULL,
    "patientId" TEXT,
    "patientUhid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "currentStep" TEXT,
    "steps" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "NxWorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxAIInteraction" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "prompt" TEXT,
    "response" TEXT,
    "confidence" DOUBLE PRECISION,
    "consentFlag" BOOLEAN,
    "promptVersion" TEXT,
    "modelVersion" TEXT,
    "thresholdAction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxAIInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxOrganization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxDepartment" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "floor" TEXT,
    "headStaffName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxSessionRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "deviceLabel" TEXT,
    "trustedDevice" BOOLEAN NOT NULL DEFAULT false,
    "breakGlass" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "NxSessionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxLoginAttempt" (
    "id" TEXT NOT NULL,
    "staffCode" TEXT NOT NULL,
    "userId" TEXT,
    "method" TEXT NOT NULL DEFAULT 'pin',
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxPasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxPasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxEmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxEmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxUserRoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleKey" TEXT NOT NULL,
    "hospitalId" TEXT,
    "departmentId" TEXT,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "NxUserRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxPermissionGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "effect" TEXT NOT NULL DEFAULT 'allow',
    "scope" TEXT NOT NULL DEFAULT 'hospital',
    "scopeRef" TEXT,
    "reason" TEXT,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "NxPermissionGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxDelegation" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "roleKey" TEXT,
    "permission" TEXT,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxBreakGlassEvent" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "patientId" TEXT,
    "patientName" TEXT,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxBreakGlassEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxNotification" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "userId" TEXT,
    "roleKey" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "level" TEXT NOT NULL DEFAULT 'info',
    "category" TEXT NOT NULL DEFAULT 'system',
    "link" TEXT,
    "patientId" TEXT,
    "meta" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxUserPrefs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "widgets" TEXT,
    "density" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxUserPrefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxFeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "rollout" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxFeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxSystemStatus" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxSystemStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxConsent" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientUhid" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'granted',
    "scope" TEXT,
    "recordedBy" TEXT NOT NULL,
    "note" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "NxConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxNoteVersion" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changeKind" TEXT NOT NULL DEFAULT 'edit',
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxNoteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxTaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxTaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxTaskView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxTaskView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxChannel" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "patientId" TEXT,
    "department" TEXT,
    "memberRoles" TEXT,
    "createdBy" TEXT,
    "archivedAt" TIMESTAMP(3),
    "retentionDays" INTEGER NOT NULL DEFAULT 365,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxChannelMember" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "memberRole" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "NxChannelMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxMessageRead" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxMessageRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxMedicationAdministration" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientUhid" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "orderId" TEXT,
    "medicineName" TEXT NOT NULL,
    "dose" TEXT,
    "route" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "administeredAt" TIMESTAMP(3),
    "administeredBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "controlled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxMedicationAdministration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxImagingReport" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "modality" TEXT NOT NULL DEFAULT 'xray',
    "findings" TEXT,
    "impression" TEXT,
    "radiologistName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'preliminary',
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxImagingReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxCharge" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientUhid" TEXT,
    "billId" TEXT,
    "encounterId" TEXT,
    "code" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxPayment" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientUhid" TEXT,
    "billId" TEXT,
    "amount" INTEGER NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'upi',
    "reference" TEXT,
    "receivedBy" TEXT,
    "note" TEXT,
    "refundOfId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxVendor" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxPurchaseOrder" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "items" TEXT NOT NULL,
    "totalValue" INTEGER NOT NULL DEFAULT 0,
    "raisedBy" TEXT,
    "expectedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxStockTxn" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "batchNo" TEXT,
    "reason" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxStockTxn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxCredential" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'license',
    "name" TEXT NOT NULL,
    "issuedBy" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxShiftAssignment" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shift" TEXT NOT NULL DEFAULT 'morning',
    "onCall" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxAppointmentWaitlist" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientName" TEXT,
    "doctorId" TEXT,
    "department" TEXT,
    "preferredDate" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'routine',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "promotedAppointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxAppointmentWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxAppointmentEvent" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxAppointmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxWebhookEndpoint" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastSuccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxWebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxWebhookDelivery" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "event" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "endpointId" TEXT,
    "latencyMs" INTEGER,
    "lastAttemptAt" TIMESTAMP(3),
    "responseCode" INTEGER,
    "nextRetryAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxWebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxIntegrationEvent" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "source" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxIntegrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxFileObject" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'document',
    "patientId" TEXT,
    "ownerId" TEXT,
    "ownerName" TEXT,
    "data" TEXT,
    "url" TEXT,
    "scanStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxFileObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxIdempotency" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "userId" TEXT,
    "requestHash" TEXT NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxIdempotency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxTenant" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'standard',
    "status" TEXT NOT NULL DEFAULT 'active',
    "brandingJson" TEXT,
    "modulesJson" TEXT,
    "domainsJson" TEXT,
    "settingsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "rateLimitPerMin" INTEGER NOT NULL DEFAULT 60,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxAbacPolicy" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "role" TEXT,
    "effect" TEXT NOT NULL DEFAULT 'allow',
    "deptScope" TEXT,
    "wardScope" TEXT,
    "patientScope" TEXT NOT NULL DEFAULT 'any',
    "timeWindows" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxAbacPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxEscalationPolicy" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "levelsJson" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxEscalationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxEscalationEvent" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "policyId" TEXT,
    "alertType" TEXT NOT NULL,
    "entityRef" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "actorName" TEXT,
    "detailJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxEscalationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxPathwayDef" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "stepsJson" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxPathwayDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxPathwayRun" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "defId" TEXT NOT NULL,
    "patientId" TEXT,
    "patientName" TEXT,
    "currentStep" TEXT NOT NULL,
    "stateJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedBy" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxPathwayRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxTimestampBlock" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "merkleRoot" TEXT NOT NULL,
    "leafCount" INTEGER NOT NULL,
    "prevHash" TEXT,
    "blockHash" TEXT NOT NULL,
    "anchoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxTimestampBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxVerifiableCredential" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "claimsJson" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "holderHint" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "hospitalId" TEXT NOT NULL,

    CONSTRAINT "NxVerifiableCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxInsuranceContract" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT,
    "patientName" TEXT,
    "insurer" TEXT NOT NULL,
    "policyNo" TEXT NOT NULL,
    "milestonesJson" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "payoutTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "settledAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "historyJson" TEXT,
    "claimId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxInsuranceContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxWearableDevice" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "model" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pairedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "secretHash" TEXT,

    CONSTRAINT "NxWearableDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxWearableSample" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxWearableSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxGenomicProfile" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "vaultRef" TEXT NOT NULL,
    "variantsJson" TEXT,
    "riskJson" TEXT,
    "consentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxGenomicProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxSimulationScenario" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'clinician',
    "difficulty" TEXT NOT NULL DEFAULT 'intermediate',
    "treeJson" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxSimulationScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxSimulationRun" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL DEFAULT 'staff',
    "subjectName" TEXT,
    "choicesJson" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxSimulationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxPlugin" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "vendor" TEXT,
    "permissionsJson" TEXT NOT NULL,
    "entryJson" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxPlugin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxHospitalTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "configJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxHospitalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxTeleConsult" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientName" TEXT,
    "doctorId" TEXT,
    "doctorName" TEXT,
    "state" TEXT NOT NULL DEFAULT 'requested',
    "bandwidthMode" TEXT NOT NULL DEFAULT 'auto',
    "routedReason" TEXT,
    "consentId" TEXT,
    "eSignHash" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxTeleConsult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxAiThreshold" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "minConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "requireReview" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxAiThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxAiFeedback" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "staffRole" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "correction" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxAiFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxDicomStudy" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "accession" TEXT NOT NULL,
    "studyUid" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "bodyPart" TEXT,
    "seriesCount" INTEGER NOT NULL DEFAULT 1,
    "viewerUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "reportedBy" TEXT,
    "reportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxDicomStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxDocVersion" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changeKind" TEXT NOT NULL DEFAULT 'edit',
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "trackedJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxDocVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxJourneyAnnotation" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "eventRef" TEXT,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "decisionLog" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxJourneyAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxEventLog" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "payloadJson" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NxEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pie_bio_signals" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "patientId" TEXT,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "quality" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pie_bio_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pie_lifestream_events" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT,
    "source" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "conceptCode" TEXT,
    "conceptSystem" TEXT,
    "title" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "unit" TEXT,
    "severity" TEXT,
    "outlier" BOOLEAN NOT NULL DEFAULT false,
    "dataJson" TEXT,
    "ts" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pie_lifestream_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pie_twin_states" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "stateJson" TEXT NOT NULL,
    "baselineJson" TEXT NOT NULL,
    "weightsJson" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pie_twin_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pie_risk_assessments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT,
    "domain" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "band" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "horizonHours" INTEGER NOT NULL DEFAULT 24,
    "driversJson" TEXT NOT NULL,
    "trendJson" TEXT,
    "modelVersion" TEXT NOT NULL,
    "uncertain" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pie_risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pie_protocols" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "alert" TEXT NOT NULL,
    "primaryDriver" TEXT NOT NULL,
    "immediateJson" TEXT NOT NULL,
    "monitoringJson" TEXT NOT NULL,
    "dispo" TEXT,
    "evidence" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "createdBy" TEXT NOT NULL DEFAULT 'PIE',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "tasksCreated" BOOLEAN NOT NULL DEFAULT false,
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pie_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pie_graph_nodes" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "propsJson" TEXT,

    CONSTRAINT "pie_graph_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pie_graph_edges" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "propsJson" TEXT,

    CONSTRAINT "pie_graph_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pie_sdoh_profiles" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "regionKey" TEXT NOT NULL,
    "aqi" INTEGER,
    "tempC" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "foodDesertKm" DOUBLE PRECISION,
    "crimeIndex" DOUBLE PRECISION,
    "greenSpaceIndex" DOUBLE PRECISION,
    "updatedFrom" TEXT NOT NULL DEFAULT 'nexura-regional-dataset',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pie_sdoh_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pie_adherence_events" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pie_adherence_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pie_federated_updates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "versionBase" TEXT NOT NULL,
    "versionNew" TEXT NOT NULL,
    "deltaJson" TEXT NOT NULL,
    "samples" INTEGER NOT NULL,
    "loss" DOUBLE PRECISION,
    "aggregated" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pie_federated_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pie_model_registry" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "samdClass" TEXT NOT NULL DEFAULT 'Class II SaMD',
    "stage" TEXT NOT NULL DEFAULT 'validated',
    "trainingWindow" TEXT NOT NULL,
    "validationJson" TEXT NOT NULL,
    "driftBaseline" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "status" TEXT NOT NULL DEFAULT 'active',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pie_model_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pie_bias_audits" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "slice" TEXT NOT NULL,
    "groupA" TEXT NOT NULL,
    "groupB" TEXT NOT NULL,
    "rateA" DOUBLE PRECISION NOT NULL,
    "rateB" DOUBLE PRECISION NOT NULL,
    "ratio" DOUBLE PRECISION NOT NULL,
    "pass" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pie_bias_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForesightRun" (
    "id" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "band" TEXT NOT NULL,
    "triageLevel" TEXT NOT NULL DEFAULT 'STANDARD',
    "topDomainId" TEXT NOT NULL,
    "inputJson" TEXT NOT NULL,
    "reportJson" TEXT NOT NULL,
    "engineVer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForesightRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiyGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "rawGoalText" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFTED',
    "timeframeDays" INTEGER,
    "requestedTimeframeDays" INTEGER,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "needsClarify" BOOLEAN NOT NULL DEFAULT false,
    "clarifyQuestion" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiyPlan" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "roadmap" TEXT NOT NULL,
    "sourcePack" TEXT NOT NULL,
    "sourceKeys" TEXT NOT NULL,
    "aiEnriched" BOOLEAN NOT NULL DEFAULT false,
    "contentValidated" BOOLEAN NOT NULL DEFAULT false,
    "burdenScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiredAt" TIMESTAMP(3),
    "portalUserId" TEXT,

    CONSTRAINT "DiyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiyMilestone" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "targetDay" INTEGER NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DiyMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiyTask" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "cadence" TEXT NOT NULL DEFAULT 'DAILY',
    "estMinutes" INTEGER NOT NULL DEFAULT 10,
    "dayOffset" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiyTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiyTaskCompletion" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DONE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "portalUserId" TEXT,

    CONSTRAINT "DiyTaskCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiyProgressLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "skippedTasks" INTEGER NOT NULL DEFAULT 0,
    "symptoms" TEXT,
    "mood" INTEGER,
    "energy" INTEGER,
    "sleep" INTEGER,
    "userNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "portalUserId" TEXT,

    CONSTRAINT "DiyProgressLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiyGoalConflict" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalAId" TEXT NOT NULL,
    "goalBId" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "resolution" TEXT NOT NULL DEFAULT 'TRIMMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "portalUserId" TEXT,

    CONSTRAINT "DiyGoalConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiyConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "portalUserId" TEXT,

    CONSTRAINT "DiyConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiySafetyEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "matchedPattern" TEXT NOT NULL,
    "sourceSnippet" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "portalUserId" TEXT,

    CONSTRAINT "DiySafetyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiyPlanChange" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "fromVer" INTEGER NOT NULL,
    "toVer" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiyPlanChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiyKnowledgeSource" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'INTERNAL_REVIEW',
    "url" TEXT,
    "prohibitedUse" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiyKnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiyAiAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "capability" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "requestId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "portalUserId" TEXT,

    CONSTRAINT "DiyAiAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiyGeneration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "planIds" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "portalUserId" TEXT,

    CONSTRAINT "DiyGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NxJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NxJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalFamilyInvite" (
    "id" TEXT NOT NULL,
    "headId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalFamilyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_type_idx" ON "Lead"("type");

-- CreateIndex
CREATE INDEX "PharmaBranch_companyId_idx" ON "PharmaBranch"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmaStaff_email_key" ON "PharmaStaff"("email");

-- CreateIndex
CREATE INDEX "PharmaStaff_companyId_idx" ON "PharmaStaff"("companyId");

-- CreateIndex
CREATE INDEX "PharmaStaff_branchId_idx" ON "PharmaStaff"("branchId");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_gstin_idx" ON "Customer"("gstin");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_genericName_idx" ON "Product"("genericName");

-- CreateIndex
CREATE INDEX "Product_hsn_idx" ON "Product"("hsn");

-- CreateIndex
CREATE INDEX "ProductBatch_productId_idx" ON "ProductBatch"("productId");

-- CreateIndex
CREATE INDEX "ProductBatch_branchId_idx" ON "ProductBatch"("branchId");

-- CreateIndex
CREATE INDEX "ProductBatch_batchNo_idx" ON "ProductBatch"("batchNo");

-- CreateIndex
CREATE INDEX "ProductBatch_barcode_idx" ON "ProductBatch"("barcode");

-- CreateIndex
CREATE INDEX "ProductBatch_expDate_idx" ON "ProductBatch"("expDate");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_invoiceNo_key" ON "Sale"("invoiceNo");

-- CreateIndex
CREATE INDEX "Sale_branchId_idx" ON "Sale"("branchId");

-- CreateIndex
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");

-- CreateIndex
CREATE INDEX "Sale_invoiceNo_idx" ON "Sale"("invoiceNo");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_poNo_key" ON "Purchase"("poNo");

-- CreateIndex
CREATE INDEX "Purchase_branchId_idx" ON "Purchase"("branchId");

-- CreateIndex
CREATE INDEX "Purchase_supplierId_idx" ON "Purchase"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "Hospital_tenantId_idx" ON "Hospital"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalPatient_uhid_key" ON "HospitalPatient"("uhid");

-- CreateIndex
CREATE INDEX "HospitalPatient_hospitalId_idx" ON "HospitalPatient"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalPatient_uhid_idx" ON "HospitalPatient"("uhid");

-- CreateIndex
CREATE INDEX "HospitalPatient_abhaId_idx" ON "HospitalPatient"("abhaId");

-- CreateIndex
CREATE INDEX "HospitalPatient_phone_idx" ON "HospitalPatient"("phone");

-- CreateIndex
CREATE INDEX "HospitalDoctor_hospitalId_idx" ON "HospitalDoctor"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalDoctor_specialty_idx" ON "HospitalDoctor"("specialty");

-- CreateIndex
CREATE INDEX "HospitalStaff_hospitalId_idx" ON "HospitalStaff"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalStaff_role_idx" ON "HospitalStaff"("role");

-- CreateIndex
CREATE INDEX "HospitalWard_hospitalId_idx" ON "HospitalWard"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalBed_hospitalId_idx" ON "HospitalBed"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalBed_status_idx" ON "HospitalBed"("status");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalBed_wardId_bedNumber_key" ON "HospitalBed"("wardId", "bedNumber");

-- CreateIndex
CREATE INDEX "HospitalAppointment_hospitalId_idx" ON "HospitalAppointment"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalAppointment_patientId_idx" ON "HospitalAppointment"("patientId");

-- CreateIndex
CREATE INDEX "HospitalAppointment_doctorId_idx" ON "HospitalAppointment"("doctorId");

-- CreateIndex
CREATE INDEX "HospitalAppointment_date_idx" ON "HospitalAppointment"("date");

-- CreateIndex
CREATE INDEX "HospitalAppointment_status_idx" ON "HospitalAppointment"("status");

-- CreateIndex
CREATE INDEX "HospitalAdmission_hospitalId_idx" ON "HospitalAdmission"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalAdmission_patientId_idx" ON "HospitalAdmission"("patientId");

-- CreateIndex
CREATE INDEX "HospitalAdmission_bedId_idx" ON "HospitalAdmission"("bedId");

-- CreateIndex
CREATE INDEX "HospitalAdmission_dischargeStatus_idx" ON "HospitalAdmission"("dischargeStatus");

-- CreateIndex
CREATE INDEX "HospitalVital_patientId_idx" ON "HospitalVital"("patientId");

-- CreateIndex
CREATE INDEX "HospitalVital_admissionId_idx" ON "HospitalVital"("admissionId");

-- CreateIndex
CREATE INDEX "HospitalVital_recordedAt_idx" ON "HospitalVital"("recordedAt");

-- CreateIndex
CREATE INDEX "HospitalVital_hospitalId_idx" ON "HospitalVital"("hospitalId");

-- CreateIndex
CREATE INDEX "ClinicalNote_patientId_idx" ON "ClinicalNote"("patientId");

-- CreateIndex
CREATE INDEX "ClinicalNote_admissionId_idx" ON "ClinicalNote"("admissionId");

-- CreateIndex
CREATE INDEX "ClinicalNote_noteType_idx" ON "ClinicalNote"("noteType");

-- CreateIndex
CREATE INDEX "ClinicalNote_status_idx" ON "ClinicalNote"("status");

-- CreateIndex
CREATE INDEX "ClinicalNote_hospitalId_idx" ON "ClinicalNote"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalOrder_patientId_idx" ON "HospitalOrder"("patientId");

-- CreateIndex
CREATE INDEX "HospitalOrder_orderType_idx" ON "HospitalOrder"("orderType");

-- CreateIndex
CREATE INDEX "HospitalOrder_status_idx" ON "HospitalOrder"("status");

-- CreateIndex
CREATE INDEX "HospitalOrder_priority_idx" ON "HospitalOrder"("priority");

-- CreateIndex
CREATE INDEX "HospitalOrder_hospitalId_idx" ON "HospitalOrder"("hospitalId");

-- CreateIndex
CREATE INDEX "LabResult_orderId_idx" ON "LabResult"("orderId");

-- CreateIndex
CREATE INDEX "LabResult_abnormalFlag_idx" ON "LabResult"("abnormalFlag");

-- CreateIndex
CREATE INDEX "LabResult_verificationStatus_idx" ON "LabResult"("verificationStatus");

-- CreateIndex
CREATE INDEX "HospitalMedicine_medicineName_idx" ON "HospitalMedicine"("medicineName");

-- CreateIndex
CREATE INDEX "HospitalMedicine_genericName_idx" ON "HospitalMedicine"("genericName");

-- CreateIndex
CREATE INDEX "HospitalPrescription_patientId_idx" ON "HospitalPrescription"("patientId");

-- CreateIndex
CREATE INDEX "HospitalPrescription_consultationId_idx" ON "HospitalPrescription"("consultationId");

-- CreateIndex
CREATE INDEX "HospitalPrescription_hospitalId_idx" ON "HospitalPrescription"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalBill_patientId_idx" ON "HospitalBill"("patientId");

-- CreateIndex
CREATE INDEX "HospitalBill_billDate_idx" ON "HospitalBill"("billDate");

-- CreateIndex
CREATE INDEX "HospitalBill_paymentStatus_idx" ON "HospitalBill"("paymentStatus");

-- CreateIndex
CREATE INDEX "HospitalBill_hospitalId_idx" ON "HospitalBill"("hospitalId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_patientId_idx" ON "InsuranceClaim"("patientId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_tpaCompany_idx" ON "InsuranceClaim"("tpaCompany");

-- CreateIndex
CREATE INDEX "InsuranceClaim_preAuthStatus_idx" ON "InsuranceClaim"("preAuthStatus");

-- CreateIndex
CREATE INDEX "InsuranceClaim_hospitalId_idx" ON "InsuranceClaim"("hospitalId");

-- CreateIndex
CREATE INDEX "BloodBankUnit_hospitalId_idx" ON "BloodBankUnit"("hospitalId");

-- CreateIndex
CREATE INDEX "BloodBankUnit_bloodGroup_idx" ON "BloodBankUnit"("bloodGroup");

-- CreateIndex
CREATE INDEX "OTSurgery_hospitalId_idx" ON "OTSurgery"("hospitalId");

-- CreateIndex
CREATE INDEX "OTSurgery_status_idx" ON "OTSurgery"("status");

-- CreateIndex
CREATE INDEX "OTSurgery_plannedStartTime_idx" ON "OTSurgery"("plannedStartTime");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_bookingSlug_key" ON "Clinic"("bookingSlug");

-- CreateIndex
CREATE INDEX "ClinicDoctor_clinicId_idx" ON "ClinicDoctor"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicPatient_mrn_key" ON "ClinicPatient"("mrn");

-- CreateIndex
CREATE INDEX "ClinicPatient_clinicId_idx" ON "ClinicPatient"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicPatient_phone_idx" ON "ClinicPatient"("phone");

-- CreateIndex
CREATE INDEX "ClinicPatient_name_idx" ON "ClinicPatient"("name");

-- CreateIndex
CREATE INDEX "ClinicPatient_abhaId_idx" ON "ClinicPatient"("abhaId");

-- CreateIndex
CREATE INDEX "ClinicAppointment_clinicId_idx" ON "ClinicAppointment"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicAppointment_doctorId_idx" ON "ClinicAppointment"("doctorId");

-- CreateIndex
CREATE INDEX "ClinicAppointment_slot_idx" ON "ClinicAppointment"("slot");

-- CreateIndex
CREATE INDEX "ClinicAppointment_status_idx" ON "ClinicAppointment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicVisit_appointmentId_key" ON "ClinicVisit"("appointmentId");

-- CreateIndex
CREATE INDEX "ClinicVisit_clinicId_idx" ON "ClinicVisit"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicVisit_patientId_idx" ON "ClinicVisit"("patientId");

-- CreateIndex
CREATE INDEX "ClinicVisit_createdAt_idx" ON "ClinicVisit"("createdAt");

-- CreateIndex
CREATE INDEX "ClinicRx_visitId_idx" ON "ClinicRx"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicInvoice_invoiceNo_key" ON "ClinicInvoice"("invoiceNo");

-- CreateIndex
CREATE INDEX "ClinicInvoice_clinicId_idx" ON "ClinicInvoice"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicInvoice_patientId_idx" ON "ClinicInvoice"("patientId");

-- CreateIndex
CREATE INDEX "ClinicInvoice_status_idx" ON "ClinicInvoice"("status");

-- CreateIndex
CREATE INDEX "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierPayment_createdAt_idx" ON "SupplierPayment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccount_customerId_key" ON "CustomerAccount"("customerId");

-- CreateIndex
CREATE INDEX "CustomerAccount_customerId_idx" ON "CustomerAccount"("customerId");

-- CreateIndex
CREATE INDEX "CustomerPayment_customerId_idx" ON "CustomerPayment"("customerId");

-- CreateIndex
CREATE INDEX "CustomerPayment_createdAt_idx" ON "CustomerPayment"("createdAt");

-- CreateIndex
CREATE INDEX "ScheduleHEntry_branchId_idx" ON "ScheduleHEntry"("branchId");

-- CreateIndex
CREATE INDEX "ScheduleHEntry_saleDate_idx" ON "ScheduleHEntry"("saleDate");

-- CreateIndex
CREATE INDEX "ScheduleHEntry_serialNo_idx" ON "ScheduleHEntry"("serialNo");

-- CreateIndex
CREATE UNIQUE INDEX "NearExpiryReturn_returnNo_key" ON "NearExpiryReturn"("returnNo");

-- CreateIndex
CREATE INDEX "NearExpiryReturn_branchId_idx" ON "NearExpiryReturn"("branchId");

-- CreateIndex
CREATE INDEX "NearExpiryReturn_supplierId_idx" ON "NearExpiryReturn"("supplierId");

-- CreateIndex
CREATE INDEX "NearExpiryReturnItem_returnId_idx" ON "NearExpiryReturnItem"("returnId");

-- CreateIndex
CREATE INDEX "DayClosing_branchId_idx" ON "DayClosing"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "DayClosing_branchId_closingDate_key" ON "DayClosing"("branchId", "closingDate");

-- CreateIndex
CREATE INDEX "IndianDrug_brandName_idx" ON "IndianDrug"("brandName");

-- CreateIndex
CREATE INDEX "IndianDrug_saltName_idx" ON "IndianDrug"("saltName");

-- CreateIndex
CREATE INDEX "IndianDrug_category_idx" ON "IndianDrug"("category");

-- CreateIndex
CREATE INDEX "OnlineBooking_clinicId_idx" ON "OnlineBooking"("clinicId");

-- CreateIndex
CREATE INDEX "OnlineBooking_slot_idx" ON "OnlineBooking"("slot");

-- CreateIndex
CREATE INDEX "OnlineBooking_status_idx" ON "OnlineBooking"("status");

-- CreateIndex
CREATE INDEX "FollowUp_patientId_idx" ON "FollowUp"("patientId");

-- CreateIndex
CREATE INDEX "FollowUp_followUpDate_idx" ON "FollowUp"("followUpDate");

-- CreateIndex
CREATE INDEX "FollowUp_status_idx" ON "FollowUp"("status");

-- CreateIndex
CREATE INDEX "ConnectConnection_doctorId_idx" ON "ConnectConnection"("doctorId");

-- CreateIndex
CREATE INDEX "ConnectConnection_patientId_idx" ON "ConnectConnection"("patientId");

-- CreateIndex
CREATE INDEX "ConnectConnection_source_idx" ON "ConnectConnection"("source");

-- CreateIndex
CREATE INDEX "ConnectConnection_active_idx" ON "ConnectConnection"("active");

-- CreateIndex
CREATE INDEX "ConnectMessage_connectionId_idx" ON "ConnectMessage"("connectionId");

-- CreateIndex
CREATE INDEX "ConnectMessage_createdAt_idx" ON "ConnectMessage"("createdAt");

-- CreateIndex
CREATE INDEX "ConnectMessage_read_idx" ON "ConnectMessage"("read");

-- CreateIndex
CREATE INDEX "ConnectCall_connectionId_idx" ON "ConnectCall"("connectionId");

-- CreateIndex
CREATE INDEX "ConnectCall_status_idx" ON "ConnectCall"("status");

-- CreateIndex
CREATE INDEX "ConnectQueue_status_idx" ON "ConnectQueue"("status");

-- CreateIndex
CREATE INDEX "ConnectQueue_requestedMode_idx" ON "ConnectQueue"("requestedMode");

-- CreateIndex
CREATE INDEX "TourismInquiry_hospitalId_idx" ON "TourismInquiry"("hospitalId");

-- CreateIndex
CREATE INDEX "TourismInquiry_status_idx" ON "TourismInquiry"("status");

-- CreateIndex
CREATE INDEX "TourismInquiry_patientCountry_idx" ON "TourismInquiry"("patientCountry");

-- CreateIndex
CREATE INDEX "TourismProcedure_hospitalId_idx" ON "TourismProcedure"("hospitalId");

-- CreateIndex
CREATE INDEX "TourismProcedure_category_idx" ON "TourismProcedure"("category");

-- CreateIndex
CREATE UNIQUE INDEX "TourismSetting_hospitalId_key" ON "TourismSetting"("hospitalId");

-- CreateIndex
CREATE INDEX "TourismSetting_hospitalId_idx" ON "TourismSetting"("hospitalId");

-- CreateIndex
CREATE INDEX "TourismCoordinator_hospitalId_idx" ON "TourismCoordinator"("hospitalId");

-- CreateIndex
CREATE INDEX "TourismTestimonial_hospitalId_idx" ON "TourismTestimonial"("hospitalId");

-- CreateIndex
CREATE INDEX "CurrencyRate_fetchedAt_idx" ON "CurrencyRate"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortalUser_phone_key" ON "PortalUser"("phone");

-- CreateIndex
CREATE INDEX "PortalUser_phone_idx" ON "PortalUser"("phone");

-- CreateIndex
CREATE INDEX "PortalUser_abhaId_idx" ON "PortalUser"("abhaId");

-- CreateIndex
CREATE UNIQUE INDEX "BloodBooking_bookingRef_key" ON "BloodBooking"("bookingRef");

-- CreateIndex
CREATE INDEX "BloodBooking_userId_status_idx" ON "BloodBooking"("userId", "status");

-- CreateIndex
CREATE INDEX "BloodBooking_scheduledDate_idx" ON "BloodBooking"("scheduledDate");

-- CreateIndex
CREATE INDEX "Phlebotomist_city_isAvailable_idx" ON "Phlebotomist"("city", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "NxStaffUser_staffCode_key" ON "NxStaffUser"("staffCode");

-- CreateIndex
CREATE INDEX "NxStaffUser_hospitalId_role_idx" ON "NxStaffUser"("hospitalId", "role");

-- CreateIndex
CREATE INDEX "NxStaffUser_email_idx" ON "NxStaffUser"("email");

-- CreateIndex
CREATE INDEX "NxStaffUser_status_idx" ON "NxStaffUser"("status");

-- CreateIndex
CREATE INDEX "NxTask_hospitalId_status_idx" ON "NxTask"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "NxTask_ownerRole_status_idx" ON "NxTask"("ownerRole", "status");

-- CreateIndex
CREATE INDEX "NxTask_priority_dueAt_idx" ON "NxTask"("priority", "dueAt");

-- CreateIndex
CREATE INDEX "NxTask_assignedToUserId_idx" ON "NxTask"("assignedToUserId");

-- CreateIndex
CREATE INDEX "NxIncident_hospitalId_status_idx" ON "NxIncident"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "NxAuditEvent_hospitalId_createdAt_idx" ON "NxAuditEvent"("hospitalId", "createdAt");

-- CreateIndex
CREATE INDEX "NxAuditEvent_entityType_entityId_idx" ON "NxAuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "NxOrderEvent_orderId_idx" ON "NxOrderEvent"("orderId");

-- CreateIndex
CREATE INDEX "NxOrderEvent_hospitalId_idx" ON "NxOrderEvent"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "NxEquipment_assetTag_key" ON "NxEquipment"("assetTag");

-- CreateIndex
CREATE INDEX "NxEquipment_hospitalId_status_idx" ON "NxEquipment"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "NxSupplyItem_hospitalId_category_idx" ON "NxSupplyItem"("hospitalId", "category");

-- CreateIndex
CREATE INDEX "NxMessage_channelKey_createdAt_idx" ON "NxMessage"("channelKey", "createdAt");

-- CreateIndex
CREATE INDEX "NxMessage_hospitalId_idx" ON "NxMessage"("hospitalId");

-- CreateIndex
CREATE INDEX "NxAutomationRule_hospitalId_triggerType_idx" ON "NxAutomationRule"("hospitalId", "triggerType");

-- CreateIndex
CREATE INDEX "NxWorkflowRun_hospitalId_startedAt_idx" ON "NxWorkflowRun"("hospitalId", "startedAt");

-- CreateIndex
CREATE INDEX "NxAIInteraction_hospitalId_createdAt_idx" ON "NxAIInteraction"("hospitalId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NxOrganization_slug_key" ON "NxOrganization"("slug");

-- CreateIndex
CREATE INDEX "NxDepartment_hospitalId_idx" ON "NxDepartment"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "NxDepartment_hospitalId_code_key" ON "NxDepartment"("hospitalId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "NxSessionRecord_jti_key" ON "NxSessionRecord"("jti");

-- CreateIndex
CREATE INDEX "NxSessionRecord_userId_revokedAt_idx" ON "NxSessionRecord"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "NxLoginAttempt_staffCode_createdAt_idx" ON "NxLoginAttempt"("staffCode", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NxPasswordResetToken_tokenHash_key" ON "NxPasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "NxPasswordResetToken_userId_idx" ON "NxPasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NxEmailVerificationToken_tokenHash_key" ON "NxEmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "NxEmailVerificationToken_userId_idx" ON "NxEmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "NxUserRoleAssignment_userId_idx" ON "NxUserRoleAssignment"("userId");

-- CreateIndex
CREATE INDEX "NxUserRoleAssignment_roleKey_idx" ON "NxUserRoleAssignment"("roleKey");

-- CreateIndex
CREATE INDEX "NxUserRoleAssignment_hospitalId_idx" ON "NxUserRoleAssignment"("hospitalId");

-- CreateIndex
CREATE INDEX "NxPermissionGrant_userId_permission_idx" ON "NxPermissionGrant"("userId", "permission");

-- CreateIndex
CREATE INDEX "NxDelegation_toUserId_expiresAt_idx" ON "NxDelegation"("toUserId", "expiresAt");

-- CreateIndex
CREATE INDEX "NxBreakGlassEvent_hospitalId_createdAt_idx" ON "NxBreakGlassEvent"("hospitalId", "createdAt");

-- CreateIndex
CREATE INDEX "NxNotification_hospitalId_userId_readAt_idx" ON "NxNotification"("hospitalId", "userId", "readAt");

-- CreateIndex
CREATE INDEX "NxNotification_roleKey_readAt_idx" ON "NxNotification"("roleKey", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "NxUserPrefs_userId_key" ON "NxUserPrefs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NxFeatureFlag_key_key" ON "NxFeatureFlag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "NxSystemStatus_key_key" ON "NxSystemStatus"("key");

-- CreateIndex
CREATE INDEX "NxConsent_patientId_idx" ON "NxConsent"("patientId");

-- CreateIndex
CREATE INDEX "NxConsent_hospitalId_type_idx" ON "NxConsent"("hospitalId", "type");

-- CreateIndex
CREATE INDEX "NxNoteVersion_noteId_idx" ON "NxNoteVersion"("noteId");

-- CreateIndex
CREATE INDEX "NxTaskComment_taskId_idx" ON "NxTaskComment"("taskId");

-- CreateIndex
CREATE INDEX "NxTaskView_userId_idx" ON "NxTaskView"("userId");

-- CreateIndex
CREATE INDEX "NxChannel_hospitalId_kind_idx" ON "NxChannel"("hospitalId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "NxChannel_hospitalId_key_key" ON "NxChannel"("hospitalId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "NxChannelMember_channelId_userId_key" ON "NxChannelMember"("channelId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "NxMessageRead_messageId_userId_key" ON "NxMessageRead"("messageId", "userId");

-- CreateIndex
CREATE INDEX "NxMedicationAdministration_patientId_scheduledAt_idx" ON "NxMedicationAdministration"("patientId", "scheduledAt");

-- CreateIndex
CREATE INDEX "NxMedicationAdministration_hospitalId_status_idx" ON "NxMedicationAdministration"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "NxImagingReport_orderId_idx" ON "NxImagingReport"("orderId");

-- CreateIndex
CREATE INDEX "NxImagingReport_hospitalId_idx" ON "NxImagingReport"("hospitalId");

-- CreateIndex
CREATE INDEX "NxCharge_patientId_idx" ON "NxCharge"("patientId");

-- CreateIndex
CREATE INDEX "NxCharge_hospitalId_status_idx" ON "NxCharge"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "NxPayment_patientId_idx" ON "NxPayment"("patientId");

-- CreateIndex
CREATE INDEX "NxPayment_billId_idx" ON "NxPayment"("billId");

-- CreateIndex
CREATE INDEX "NxPayment_hospitalId_idx" ON "NxPayment"("hospitalId");

-- CreateIndex
CREATE INDEX "NxVendor_hospitalId_idx" ON "NxVendor"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "NxPurchaseOrder_poNumber_key" ON "NxPurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "NxPurchaseOrder_hospitalId_status_idx" ON "NxPurchaseOrder"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "NxStockTxn_itemId_createdAt_idx" ON "NxStockTxn"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "NxStockTxn_hospitalId_idx" ON "NxStockTxn"("hospitalId");

-- CreateIndex
CREATE INDEX "NxCredential_staffUserId_expiresAt_idx" ON "NxCredential"("staffUserId", "expiresAt");

-- CreateIndex
CREATE INDEX "NxShiftAssignment_hospitalId_date_idx" ON "NxShiftAssignment"("hospitalId", "date");

-- CreateIndex
CREATE INDEX "NxAppointmentWaitlist_hospitalId_status_idx" ON "NxAppointmentWaitlist"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "NxAppointmentEvent_appointmentId_idx" ON "NxAppointmentEvent"("appointmentId");

-- CreateIndex
CREATE INDEX "NxAppointmentEvent_hospitalId_idx" ON "NxAppointmentEvent"("hospitalId");

-- CreateIndex
CREATE INDEX "NxWebhookEndpoint_hospitalId_active_idx" ON "NxWebhookEndpoint"("hospitalId", "active");

-- CreateIndex
CREATE INDEX "NxWebhookDelivery_status_nextRetryAt_idx" ON "NxWebhookDelivery"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "NxWebhookDelivery_hospitalId_idx" ON "NxWebhookDelivery"("hospitalId");

-- CreateIndex
CREATE INDEX "NxIntegrationEvent_createdAt_idx" ON "NxIntegrationEvent"("createdAt");

-- CreateIndex
CREATE INDEX "NxIntegrationEvent_hospitalId_idx" ON "NxIntegrationEvent"("hospitalId");

-- CreateIndex
CREATE INDEX "NxFileObject_hospitalId_category_idx" ON "NxFileObject"("hospitalId", "category");

-- CreateIndex
CREATE INDEX "NxFileObject_patientId_idx" ON "NxFileObject"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "NxIdempotency_key_key" ON "NxIdempotency"("key");

-- CreateIndex
CREATE INDEX "NxIdempotency_expiresAt_idx" ON "NxIdempotency"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "NxTenant_code_key" ON "NxTenant"("code");

-- CreateIndex
CREATE INDEX "NxTenant_status_idx" ON "NxTenant"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NxApiKey_keyHash_key" ON "NxApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "NxApiKey_tenantId_idx" ON "NxApiKey"("tenantId");

-- CreateIndex
CREATE INDEX "NxAbacPolicy_hospitalId_resource_idx" ON "NxAbacPolicy"("hospitalId", "resource");

-- CreateIndex
CREATE INDEX "NxEscalationPolicy_hospitalId_alertType_idx" ON "NxEscalationPolicy"("hospitalId", "alertType");

-- CreateIndex
CREATE INDEX "NxEscalationEvent_hospitalId_createdAt_idx" ON "NxEscalationEvent"("hospitalId", "createdAt");

-- CreateIndex
CREATE INDEX "NxPathwayDef_hospitalId_code_idx" ON "NxPathwayDef"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "NxPathwayRun_hospitalId_status_idx" ON "NxPathwayRun"("hospitalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "NxTimestampBlock_hospitalId_index_key" ON "NxTimestampBlock"("hospitalId", "index");

-- CreateIndex
CREATE INDEX "NxVerifiableCredential_patientId_idx" ON "NxVerifiableCredential"("patientId");

-- CreateIndex
CREATE INDEX "NxInsuranceContract_hospitalId_state_idx" ON "NxInsuranceContract"("hospitalId", "state");

-- CreateIndex
CREATE INDEX "NxWearableDevice_patientId_idx" ON "NxWearableDevice"("patientId");

-- CreateIndex
CREATE INDEX "NxWearableSample_deviceId_capturedAt_idx" ON "NxWearableSample"("deviceId", "capturedAt");

-- CreateIndex
CREATE INDEX "NxGenomicProfile_patientId_idx" ON "NxGenomicProfile"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "NxSimulationScenario_code_key" ON "NxSimulationScenario"("code");

-- CreateIndex
CREATE INDEX "NxSimulationScenario_audience_idx" ON "NxSimulationScenario"("audience");

-- CreateIndex
CREATE INDEX "NxSimulationRun_scenarioId_createdAt_idx" ON "NxSimulationRun"("scenarioId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NxPlugin_code_key" ON "NxPlugin"("code");

-- CreateIndex
CREATE UNIQUE INDEX "NxHospitalTemplate_code_key" ON "NxHospitalTemplate"("code");

-- CreateIndex
CREATE INDEX "NxTeleConsult_hospitalId_state_idx" ON "NxTeleConsult"("hospitalId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "NxAiThreshold_hospitalId_feature_key" ON "NxAiThreshold"("hospitalId", "feature");

-- CreateIndex
CREATE INDEX "NxAiFeedback_interactionId_idx" ON "NxAiFeedback"("interactionId");

-- CreateIndex
CREATE INDEX "NxDicomStudy_patientId_idx" ON "NxDicomStudy"("patientId");

-- CreateIndex
CREATE INDEX "NxDocVersion_hospitalId_entityType_entityId_idx" ON "NxDocVersion"("hospitalId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "NxJourneyAnnotation_patientId_createdAt_idx" ON "NxJourneyAnnotation"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "NxEventLog_hospitalId_aggregateType_aggregateId_seq_idx" ON "NxEventLog"("hospitalId", "aggregateType", "aggregateId", "seq");

-- CreateIndex
CREATE INDEX "pie_bio_signals_patientId_metric_capturedAt_idx" ON "pie_bio_signals"("patientId", "metric", "capturedAt");

-- CreateIndex
CREATE INDEX "pie_bio_signals_deviceId_capturedAt_idx" ON "pie_bio_signals"("deviceId", "capturedAt");

-- CreateIndex
CREATE INDEX "pie_lifestream_events_patientId_ts_idx" ON "pie_lifestream_events"("patientId", "ts");

-- CreateIndex
CREATE INDEX "pie_lifestream_events_patientId_source_ts_idx" ON "pie_lifestream_events"("patientId", "source", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "pie_twin_states_patientId_key" ON "pie_twin_states"("patientId");

-- CreateIndex
CREATE INDEX "pie_risk_assessments_patientId_createdAt_idx" ON "pie_risk_assessments"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "pie_risk_assessments_hospitalId_band_createdAt_idx" ON "pie_risk_assessments"("hospitalId", "band", "createdAt");

-- CreateIndex
CREATE INDEX "pie_protocols_patientId_status_createdAt_idx" ON "pie_protocols"("patientId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pie_graph_nodes_label_key_key" ON "pie_graph_nodes"("label", "key");

-- CreateIndex
CREATE INDEX "pie_graph_edges_fromNodeId_idx" ON "pie_graph_edges"("fromNodeId");

-- CreateIndex
CREATE INDEX "pie_graph_edges_toNodeId_idx" ON "pie_graph_edges"("toNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "pie_graph_edges_type_fromNodeId_toNodeId_key" ON "pie_graph_edges"("type", "fromNodeId", "toNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "pie_sdoh_profiles_patientId_key" ON "pie_sdoh_profiles"("patientId");

-- CreateIndex
CREATE INDEX "pie_adherence_events_patientId_ts_idx" ON "pie_adherence_events"("patientId", "ts");

-- CreateIndex
CREATE INDEX "pie_federated_updates_modelId_aggregated_uploadedAt_idx" ON "pie_federated_updates"("modelId", "aggregated", "uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "pie_model_registry_modelId_version_key" ON "pie_model_registry"("modelId", "version");

-- CreateIndex
CREATE INDEX "pie_bias_audits_modelId_createdAt_idx" ON "pie_bias_audits"("modelId", "createdAt");

-- CreateIndex
CREATE INDEX "ForesightRun_subjectKey_createdAt_idx" ON "ForesightRun"("subjectKey", "createdAt");

-- CreateIndex
CREATE INDEX "DiyGoal_userId_status_idx" ON "DiyGoal"("userId", "status");

-- CreateIndex
CREATE INDEX "DiyGoal_userId_category_idx" ON "DiyGoal"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "DiyGoal_userId_batchId_clientKey_key" ON "DiyGoal"("userId", "batchId", "clientKey");

-- CreateIndex
CREATE INDEX "DiyPlan_userId_status_idx" ON "DiyPlan"("userId", "status");

-- CreateIndex
CREATE INDEX "DiyPlan_goalId_version_idx" ON "DiyPlan"("goalId", "version");

-- CreateIndex
CREATE INDEX "DiyMilestone_planId_targetDay_idx" ON "DiyMilestone"("planId", "targetDay");

-- CreateIndex
CREATE INDEX "DiyTask_planId_active_idx" ON "DiyTask"("planId", "active");

-- CreateIndex
CREATE INDEX "DiyTask_category_idx" ON "DiyTask"("category");

-- CreateIndex
CREATE INDEX "DiyTaskCompletion_userId_date_idx" ON "DiyTaskCompletion"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DiyTaskCompletion_taskId_userId_date_key" ON "DiyTaskCompletion"("taskId", "userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DiyProgressLog_userId_date_key" ON "DiyProgressLog"("userId", "date");

-- CreateIndex
CREATE INDEX "DiyGoalConflict_userId_idx" ON "DiyGoalConflict"("userId");

-- CreateIndex
CREATE INDEX "DiyConsent_userId_consentType_idx" ON "DiyConsent"("userId", "consentType");

-- CreateIndex
CREATE INDEX "DiySafetyEvent_userId_createdAt_idx" ON "DiySafetyEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DiySafetyEvent_kind_createdAt_idx" ON "DiySafetyEvent"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "DiyPlanChange_planId_idx" ON "DiyPlanChange"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "DiyKnowledgeSource_key_key" ON "DiyKnowledgeSource"("key");

-- CreateIndex
CREATE INDEX "DiyAiAudit_userId_createdAt_idx" ON "DiyAiAudit"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiyGeneration_idempotencyKey_key" ON "DiyGeneration"("idempotencyKey");

-- CreateIndex
CREATE INDEX "DiyGeneration_userId_createdAt_idx" ON "DiyGeneration"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NxJob_dedupeKey_key" ON "NxJob"("dedupeKey");

-- CreateIndex
CREATE INDEX "NxJob_status_runAt_idx" ON "NxJob"("status", "runAt");

-- CreateIndex
CREATE INDEX "NxJob_type_status_idx" ON "NxJob"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PortalFamilyInvite_tokenHash_key" ON "PortalFamilyInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "PortalFamilyInvite_phone_idx" ON "PortalFamilyInvite"("phone");

-- CreateIndex
CREATE INDEX "PortalFamilyInvite_headId_idx" ON "PortalFamilyInvite"("headId");

-- AddForeignKey
ALTER TABLE "PharmaBranch" ADD CONSTRAINT "PharmaBranch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PharmaCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmaStaff" ADD CONSTRAINT "PharmaStaff_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PharmaCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmaStaff" ADD CONSTRAINT "PharmaStaff_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "PharmaBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "PharmaBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "PharmaBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "PharmaStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "PharmaBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospital" ADD CONSTRAINT "Hospital_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "NxOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospital" ADD CONSTRAINT "Hospital_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "NxTenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalPatient" ADD CONSTRAINT "HospitalPatient_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalDoctor" ADD CONSTRAINT "HospitalDoctor_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalStaff" ADD CONSTRAINT "HospitalStaff_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalWard" ADD CONSTRAINT "HospitalWard_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalBed" ADD CONSTRAINT "HospitalBed_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalBed" ADD CONSTRAINT "HospitalBed_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "HospitalWard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAppointment" ADD CONSTRAINT "HospitalAppointment_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAppointment" ADD CONSTRAINT "HospitalAppointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "HospitalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAppointment" ADD CONSTRAINT "HospitalAppointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "HospitalDoctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAdmission" ADD CONSTRAINT "HospitalAdmission_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAdmission" ADD CONSTRAINT "HospitalAdmission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "HospitalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAdmission" ADD CONSTRAINT "HospitalAdmission_admittingDoctorId_fkey" FOREIGN KEY ("admittingDoctorId") REFERENCES "HospitalDoctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAdmission" ADD CONSTRAINT "HospitalAdmission_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "HospitalWard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAdmission" ADD CONSTRAINT "HospitalAdmission_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "HospitalBed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalVital" ADD CONSTRAINT "HospitalVital_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "HospitalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalVital" ADD CONSTRAINT "HospitalVital_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "HospitalAdmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalVital" ADD CONSTRAINT "HospitalVital_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "HospitalAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalVital" ADD CONSTRAINT "HospitalVital_recordedByStaffId_fkey" FOREIGN KEY ("recordedByStaffId") REFERENCES "HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "HospitalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "HospitalDoctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "HospitalAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "HospitalAdmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalOrder" ADD CONSTRAINT "HospitalOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "HospitalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalOrder" ADD CONSTRAINT "HospitalOrder_orderingDoctorId_fkey" FOREIGN KEY ("orderingDoctorId") REFERENCES "HospitalDoctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalOrder" ADD CONSTRAINT "HospitalOrder_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "HospitalAdmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalOrder" ADD CONSTRAINT "HospitalOrder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "HospitalAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "HospitalOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_reportedByStaffId_fkey" FOREIGN KEY ("reportedByStaffId") REFERENCES "HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalPrescription" ADD CONSTRAINT "HospitalPrescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "HospitalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalPrescription" ADD CONSTRAINT "HospitalPrescription_prescribingDoctorId_fkey" FOREIGN KEY ("prescribingDoctorId") REFERENCES "HospitalDoctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalPrescription" ADD CONSTRAINT "HospitalPrescription_consultation_appointment_fkey" FOREIGN KEY ("consultationId") REFERENCES "HospitalAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalPrescription" ADD CONSTRAINT "HospitalPrescription_consultation_admission_fkey" FOREIGN KEY ("consultationId") REFERENCES "HospitalAdmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalBill" ADD CONSTRAINT "HospitalBill_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalBill" ADD CONSTRAINT "HospitalBill_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "HospitalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalBill" ADD CONSTRAINT "HospitalBill_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "HospitalAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalBill" ADD CONSTRAINT "HospitalBill_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "HospitalAdmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "HospitalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "HospitalAdmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodBankUnit" ADD CONSTRAINT "BloodBankUnit_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTSurgery" ADD CONSTRAINT "OTSurgery_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTSurgery" ADD CONSTRAINT "OTSurgery_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "HospitalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTSurgery" ADD CONSTRAINT "OTSurgery_surgeonId_fkey" FOREIGN KEY ("surgeonId") REFERENCES "HospitalDoctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTSurgery" ADD CONSTRAINT "OTSurgery_anesthetistId_fkey" FOREIGN KEY ("anesthetistId") REFERENCES "HospitalDoctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTSurgery" ADD CONSTRAINT "OTSurgery_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "HospitalAdmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicDoctor" ADD CONSTRAINT "ClinicDoctor_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicPatient" ADD CONSTRAINT "ClinicPatient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicAppointment" ADD CONSTRAINT "ClinicAppointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicAppointment" ADD CONSTRAINT "ClinicAppointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "ClinicPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicAppointment" ADD CONSTRAINT "ClinicAppointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "ClinicDoctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicVisit" ADD CONSTRAINT "ClinicVisit_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicVisit" ADD CONSTRAINT "ClinicVisit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "ClinicPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicVisit" ADD CONSTRAINT "ClinicVisit_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "ClinicDoctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicVisit" ADD CONSTRAINT "ClinicVisit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "ClinicAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicRx" ADD CONSTRAINT "ClinicRx_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "ClinicVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicInvoice" ADD CONSTRAINT "ClinicInvoice_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicInvoice" ADD CONSTRAINT "ClinicInvoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "ClinicPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicInvoice" ADD CONSTRAINT "ClinicInvoice_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "ClinicVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAccount" ADD CONSTRAINT "CustomerAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleHEntry" ADD CONSTRAINT "ScheduleHEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "PharmaBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NearExpiryReturn" ADD CONSTRAINT "NearExpiryReturn_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NearExpiryReturn" ADD CONSTRAINT "NearExpiryReturn_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "PharmaBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NearExpiryReturnItem" ADD CONSTRAINT "NearExpiryReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "NearExpiryReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayClosing" ADD CONSTRAINT "DayClosing_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "PharmaBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineBooking" ADD CONSTRAINT "OnlineBooking_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineBooking" ADD CONSTRAINT "OnlineBooking_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "ClinicDoctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineBooking" ADD CONSTRAINT "OnlineBooking_convertedPatientId_fkey" FOREIGN KEY ("convertedPatientId") REFERENCES "ClinicPatient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "ClinicPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectMessage" ADD CONSTRAINT "ConnectMessage_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ConnectConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectCall" ADD CONSTRAINT "ConnectCall_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ConnectConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectQueue" ADD CONSTRAINT "ConnectQueue_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ConnectConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourismInquiry" ADD CONSTRAINT "TourismInquiry_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourismProcedure" ADD CONSTRAINT "TourismProcedure_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourismSetting" ADD CONSTRAINT "TourismSetting_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourismCoordinator" ADD CONSTRAINT "TourismCoordinator_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourismTestimonial" ADD CONSTRAINT "TourismTestimonial_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_familyHeadId_fkey" FOREIGN KEY ("familyHeadId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodBooking" ADD CONSTRAINT "BloodBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxStaffUser" ADD CONSTRAINT "NxStaffUser_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxStaffUser" ADD CONSTRAINT "NxStaffUser_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "NxDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxTask" ADD CONSTRAINT "NxTask_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxIncident" ADD CONSTRAINT "NxIncident_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxAuditEvent" ADD CONSTRAINT "NxAuditEvent_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxOrderEvent" ADD CONSTRAINT "NxOrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "HospitalOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxOrderEvent" ADD CONSTRAINT "NxOrderEvent_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxEquipment" ADD CONSTRAINT "NxEquipment_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxSupplyItem" ADD CONSTRAINT "NxSupplyItem_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxMessage" ADD CONSTRAINT "NxMessage_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxAutomationRule" ADD CONSTRAINT "NxAutomationRule_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxWorkflowRun" ADD CONSTRAINT "NxWorkflowRun_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxAIInteraction" ADD CONSTRAINT "NxAIInteraction_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxDepartment" ADD CONSTRAINT "NxDepartment_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxSessionRecord" ADD CONSTRAINT "NxSessionRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "NxStaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxUserRoleAssignment" ADD CONSTRAINT "NxUserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "NxStaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxPermissionGrant" ADD CONSTRAINT "NxPermissionGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "NxStaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxDelegation" ADD CONSTRAINT "NxDelegation_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "NxStaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxDelegation" ADD CONSTRAINT "NxDelegation_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "NxStaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxBreakGlassEvent" ADD CONSTRAINT "NxBreakGlassEvent_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxNotification" ADD CONSTRAINT "NxNotification_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxNotification" ADD CONSTRAINT "NxNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "NxStaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxUserPrefs" ADD CONSTRAINT "NxUserPrefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "NxStaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxConsent" ADD CONSTRAINT "NxConsent_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxConsent" ADD CONSTRAINT "NxConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "HospitalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxNoteVersion" ADD CONSTRAINT "NxNoteVersion_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "ClinicalNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxTaskComment" ADD CONSTRAINT "NxTaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "NxTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxChannel" ADD CONSTRAINT "NxChannel_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxChannelMember" ADD CONSTRAINT "NxChannelMember_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "NxChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxMessageRead" ADD CONSTRAINT "NxMessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "NxMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxMedicationAdministration" ADD CONSTRAINT "NxMedicationAdministration_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxMedicationAdministration" ADD CONSTRAINT "NxMedicationAdministration_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "HospitalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxImagingReport" ADD CONSTRAINT "NxImagingReport_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxImagingReport" ADD CONSTRAINT "NxImagingReport_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "HospitalOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxCharge" ADD CONSTRAINT "NxCharge_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxPayment" ADD CONSTRAINT "NxPayment_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxVendor" ADD CONSTRAINT "NxVendor_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxPurchaseOrder" ADD CONSTRAINT "NxPurchaseOrder_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxStockTxn" ADD CONSTRAINT "NxStockTxn_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "NxSupplyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxStockTxn" ADD CONSTRAINT "NxStockTxn_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxCredential" ADD CONSTRAINT "NxCredential_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "NxStaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxShiftAssignment" ADD CONSTRAINT "NxShiftAssignment_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "NxStaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxShiftAssignment" ADD CONSTRAINT "NxShiftAssignment_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxAppointmentWaitlist" ADD CONSTRAINT "NxAppointmentWaitlist_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxAppointmentEvent" ADD CONSTRAINT "NxAppointmentEvent_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxWebhookEndpoint" ADD CONSTRAINT "NxWebhookEndpoint_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxWebhookDelivery" ADD CONSTRAINT "NxWebhookDelivery_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxIntegrationEvent" ADD CONSTRAINT "NxIntegrationEvent_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxFileObject" ADD CONSTRAINT "NxFileObject_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxFileObject" ADD CONSTRAINT "NxFileObject_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "HospitalPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxApiKey" ADD CONSTRAINT "NxApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "NxTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxAbacPolicy" ADD CONSTRAINT "NxAbacPolicy_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxEscalationPolicy" ADD CONSTRAINT "NxEscalationPolicy_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxEscalationEvent" ADD CONSTRAINT "NxEscalationEvent_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxPathwayDef" ADD CONSTRAINT "NxPathwayDef_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxPathwayRun" ADD CONSTRAINT "NxPathwayRun_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxPathwayRun" ADD CONSTRAINT "NxPathwayRun_defId_fkey" FOREIGN KEY ("defId") REFERENCES "NxPathwayDef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxTimestampBlock" ADD CONSTRAINT "NxTimestampBlock_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxVerifiableCredential" ADD CONSTRAINT "NxVerifiableCredential_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxInsuranceContract" ADD CONSTRAINT "NxInsuranceContract_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxWearableDevice" ADD CONSTRAINT "NxWearableDevice_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxWearableSample" ADD CONSTRAINT "NxWearableSample_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "NxWearableDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxGenomicProfile" ADD CONSTRAINT "NxGenomicProfile_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxSimulationRun" ADD CONSTRAINT "NxSimulationRun_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "NxSimulationScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxTeleConsult" ADD CONSTRAINT "NxTeleConsult_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxAiThreshold" ADD CONSTRAINT "NxAiThreshold_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxAiFeedback" ADD CONSTRAINT "NxAiFeedback_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxDicomStudy" ADD CONSTRAINT "NxDicomStudy_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxDocVersion" ADD CONSTRAINT "NxDocVersion_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxJourneyAnnotation" ADD CONSTRAINT "NxJourneyAnnotation_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxEventLog" ADD CONSTRAINT "NxEventLog_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiyGoal" ADD CONSTRAINT "DiyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiyPlan" ADD CONSTRAINT "DiyPlan_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "DiyGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiyPlan" ADD CONSTRAINT "DiyPlan_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiyMilestone" ADD CONSTRAINT "DiyMilestone_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DiyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiyTask" ADD CONSTRAINT "DiyTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DiyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiyTaskCompletion" ADD CONSTRAINT "DiyTaskCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "DiyTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiyTaskCompletion" ADD CONSTRAINT "DiyTaskCompletion_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiyProgressLog" ADD CONSTRAINT "DiyProgressLog_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiyGoalConflict" ADD CONSTRAINT "DiyGoalConflict_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiyConsent" ADD CONSTRAINT "DiyConsent_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiySafetyEvent" ADD CONSTRAINT "DiySafetyEvent_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiyPlanChange" ADD CONSTRAINT "DiyPlanChange_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DiyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiyAiAudit" ADD CONSTRAINT "DiyAiAudit_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiyGeneration" ADD CONSTRAINT "DiyGeneration_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

