import React from 'react';
import { SubjectInfoCard, GridInfoCard, MarketConditionsTable, EditableField } from '../components/FormComponents';
import { Tooltip, IconButton } from '@mui/material';
import { CondoCoopProjectsTable, SubjectRentScheduleTable } from '../components/tables';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import SalesComparisonSection from '../components/SalesComparisonSection';
import ActionButtons from '../components/ActionButtons';
import PhotosGallerySection from '../components/PhotosGallerySection';
const Form1025 = ({
    data, allData, extractionAttempted, handleDataChange, editingField, setEditingField,
    highlightedSubjectFields, highlightedContractFields, highlightedSiteFields,
    condoCoopProjectsRows, condoForeclosureFields, subjectFields, contractFields,
    neighborhoodFields, siteFields, improvementsFields, salesGridRows, salesGridRows1025, comparableSales,
    salesHistoryFields, priorSaleHistoryFields, salesComparisonAdditionalInfoFields,
    marketConditionsRows, marketConditionsFields, reconciliationFields, costApproachFields,
    incomeApproachFields, pudInformationFields, appraiserFields, formType, comparisonData,
    getComparisonStyle, infoOfSalesFields, loading, loadingSection, handleStateRequirementCheck,
    stateReqLoading, handleClientRequirementCheck, clientReqLoading, handleEscalationCheck,
    escalationLoading, manualValidations, handleManualValidation, onSubjectRevisionButtonClick,
    onContractRevisionButtonClick, onNeighborhoodRevisionButtonClick, onSiteRevisionButtonClick,
    onImprovementsRevisionButtonClick, onSalesGridRevisionButtonClick, onReconciliationRevisionButtonClick,
    onCostApproachRevisionButtonClick, onCertificationRevisionButtonClick, on1007RevisionButtonClick,
    ComparableRentAdjustments, COMPARABLE_RENTAL_DATA, SUBJECT_RENT_SCHEDULE, revisionHandlers
}) => (

    <>
        <ActionButtons
            handleStateRequirementCheck={handleStateRequirementCheck}
            stateReqLoading={stateReqLoading}
            handleClientRequirementCheck={handleClientRequirementCheck}
            clientReqLoading={clientReqLoading}
            handleEscalationCheck={handleEscalationCheck}
            escalationLoading={escalationLoading}
        />
        <SubjectInfoCard id="subject-info" title="Subject Information" fields={subjectFields} data={data} extractionAttempted={extractionAttempted} onDataChange={handleDataChange} isEditable={true} editingField={editingField} setEditingField={setEditingField} highlightedFields={highlightedSubjectFields} allData={allData} comparisonData={comparisonData} getComparisonStyle={getComparisonStyle} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onSubjectRevisionButtonClick} revisionHandlers={revisionHandlers} />

        <GridInfoCard id="contract-section" title="Contract Section" fields={contractFields} data={data.CONTRACT} cardClass="bg-secondary" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['CONTRACT', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} highlightedFields={highlightedContractFields} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onContractRevisionButtonClick} revisionHandlers={revisionHandlers} />

        <GridInfoCard id="neighborhood-section" title="Neighborhood Section" fields={neighborhoodFields} data={data.NEIGHBORHOOD} cardClass="bg-info" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['NEIGHBORHOOD', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onNeighborhoodRevisionButtonClick} revisionHandlers={revisionHandlers} />
        <GridInfoCard id="site-section" title="Site Section" fields={siteFields} data={data} cardClass="bg-warning" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} highlightedFields={highlightedSiteFields} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onSiteRevisionButtonClick} revisionHandlers={revisionHandlers} />

        <GridInfoCard id="improvements-section" title="Improvements Section" fields={improvementsFields} data={data} cardClass="bg-success" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onImprovementsRevisionButtonClick} revisionHandlers={revisionHandlers} />

        <GridInfoCard id="info-of-sales-section" title="Sales Comparison Approach" fields={infoOfSalesFields} data={data.INFO_OF_SALES} cardClass="bg-primary" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['INFO_OF_SALES', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />

        <SalesComparisonSection
            data={data}
            extractionAttempted={extractionAttempted}
            handleDataChange={handleDataChange}
            editingField={editingField}

            setEditingField={setEditingField}
            salesGridRows={salesGridRows1025 || salesGridRows}
            comparableSales={comparableSales}
            salesHistoryFields={salesHistoryFields}
            salesComparisonAdditionalInfoFields={salesComparisonAdditionalInfoFields}
            isEditable={true}
            allData={allData}
            formType={formType}
            manualValidations={manualValidations}
            handleManualValidation={handleManualValidation}
            onRevisionButtonClick={onSalesGridRevisionButtonClick}
            revisionHandlers={revisionHandlers}
        />
        <div id="comparable-rental-data" style={{ marginBottom: '1rem', marginTop: '1rem' }} className="card shadow mb-4">
            <div className="card-header CAR1 bg-info text-white" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>COMPARABLE RENTAL DATA</strong>
                    {on1007RevisionButtonClick && (
                        <Tooltip title="Revision Language">
                            <IconButton onClick={on1007RevisionButtonClick} size="small" sx={{ color: 'white', marginLeft: 'auto' }}><LibraryBooksIcon /></IconButton>
                        </Tooltip>
                    )}
                </div>
            </div>
            <div className="card-body p-2 table-container" style={{ overflowX: 'auto' }}>
                <table className="table table-hover mb-0" style={{ fontSize: '0.8rem', minWidth: '1000px', border: '1px solid #ccc', borderCollapse: 'collapse', width: '100%' }}>
                    <thead className="table-light">
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                            <th colSpan={2} className="border border-gray-400 p-1 font-bold" style={{ border: '1px solid #ccc', width: '150px' }}>FEATURE</th>
                            <th colSpan={4} className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc' }}>SUBJECT</th>
                            {ComparableRentAdjustments.map((rent, idx) => (
                                <th key={idx} colSpan={5} className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc' }}>{rent}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            "Address",
                            "Proximity to Subject",
                            "Current Monthly Rent",
                            "Rent/Gross Bldg. Area",
                            "Rent Control",
                            "Data Source(s)",
                            "Date of Lease(s)",
                            "Location",
                            "Actual Age",
                            "Condition",
                            "Gross Building Area"
                        ].map((feature, idx) => {
                            const isMissingSubject = extractionAttempted && (!data.Subject || !data.Subject[feature]);
                            return (
                                <tr key={idx}>
                                    <td colSpan={2} className="border border-gray-400 p-1 font-medium" style={{ border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#fafafa' }}>{feature}</td>
                                    <td colSpan={4} className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                        <EditableField
                                            fieldPath={['Subject', feature]}
                                            value={(data.Subject && data.Subject[feature]) || ''}
                                            onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                            isMissing={isMissingSubject}
                                            isEditable={true}
                                            manualValidations={manualValidations} handleManualValidation={handleManualValidation} allData={allData} />
                                    </td>
                                    {ComparableRentAdjustments.map((rent, cidx) => {
                                        const isMissingComp = extractionAttempted && (!data[rent] || !data[rent][feature]);
                                        return (
                                            <td key={cidx} colSpan={5} className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                                <EditableField
                                                    fieldPath={[rent, feature]}
                                                    value={(data[rent] && data[rent][feature]) || ''}
                                                    onDataChange={handleDataChange}
                                                    editingField={editingField} setEditingField={setEditingField}
                                                    isMissing={isMissingComp} saleName={rent}
                                                    isEditable={true} manualValidations={manualValidations} handleManualValidation={handleManualValidation} allData={allData}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}

                        <tr style={{ backgroundColor: '#f9fafb' }}>
                            <td rowSpan={6} className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', verticalAlign: 'middle', writingMode: 'vertical-rl', transform: 'rotate(180deg)', width: '40px', backgroundColor: '#f3f4f6' }}>
                                Unit Breakdown
                            </td>
                            <td className="border border-gray-400 p-1 font-bold" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>Unit #</td>

                            <td colSpan={3} className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#f3f4f6' }}>Rm Count</td>
                            <td rowSpan={2} className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#f3f4f6', verticalAlign: 'middle' }}>Size Sq. Ft.</td>

                            {ComparableRentAdjustments.map((rent, idx) => (
                                <React.Fragment key={idx}>
                                    <td colSpan={3} className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#f3f4f6' }}>Rm Count</td>
                                    <td rowSpan={2} className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#f3f4f6', verticalAlign: 'middle' }}>Size Sq. Ft.</td>
                                    <td rowSpan={2} className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#f3f4f6', verticalAlign: 'middle' }}>Monthly Rent</td>
                                </React.Fragment>
                            ))}
                        </tr>

                        <tr style={{ backgroundColor: '#f9fafb' }}>
                            <td className="border border-gray-400 p-1 font-bold" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}></td>
                            <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>Tot</td>
                            <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>Br</td>
                            <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>Ba</td>
                            {ComparableRentAdjustments.map((rent, idx) => (
                                <React.Fragment key={idx}>
                                    <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>Tot</td>
                                    <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>Br</td>
                                    <td className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}>Ba</td>
                                </React.Fragment>
                            ))}
                        </tr>

                        {[1, 2, 3, 4].map((u) => {
                            const totKey = `Unit Breakdown Rm Count Tot Unit # ${u}`;
                            const brKey = `Unit Breakdown Rm Count Br Unit # ${u}`;
                            const baKey = `Unit Breakdown Rm Count Ba Unit # ${u}`;
                            const sizeKey = `Unit Breakdown Size Unit # ${u}`;
                            const rentKey = `Unit Breakdown Monthly Rent Unit # ${u}`;

                            return (
                                <tr key={u}>
                                    <td className="border border-gray-400 p-1 font-medium" style={{ border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#fafafa' }}>Unit #{u}</td>

                                    <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                        <EditableField fieldPath={['Subject', totKey]} value={(data.Subject && data.Subject[totKey]) || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                    </td>
                                    <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                        <EditableField fieldPath={['Subject', brKey]} value={(data.Subject && data.Subject[brKey]) || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                    </td>
                                    <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                        <EditableField fieldPath={['Subject', baKey]} value={(data.Subject && data.Subject[baKey]) || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                    </td>
                                    <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                        <EditableField fieldPath={['Subject', sizeKey]} value={(data.Subject && data.Subject[sizeKey]) || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                    </td>

                                    {ComparableRentAdjustments.map((rent, cidx) => (
                                        <React.Fragment key={cidx}>
                                            <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                                <EditableField fieldPath={[rent, totKey]} value={(data[rent] && data[rent][totKey]) || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                            </td>
                                            <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                                <EditableField fieldPath={[rent, brKey]} value={(data[rent] && data[rent][brKey]) || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                            </td>
                                            <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                                <EditableField fieldPath={[rent, baKey]} value={(data[rent] && data[rent][baKey]) || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                            </td>
                                            <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                                <EditableField fieldPath={[rent, sizeKey]} value={(data[rent] && data[rent][sizeKey]) || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                            </td>
                                            <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                                <EditableField fieldPath={[rent, rentKey]} value={(data[rent] && data[rent][rentKey]) || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} />
                                            </td>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            );
                        })}

                        <tr>
                            <td colSpan={2} className="border border-gray-400 p-1 font-medium" style={{ border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#fafafa' }}>Utilities Included</td>
                            <td colSpan={4} className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                <EditableField
                                    fieldPath={['Subject', 'Utilities Included']}
                                    value={(data.Subject && data.Subject['Utilities Included']) || ''}
                                    onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                    isEditable={true} allData={allData} />
                            </td>
                            {ComparableRentAdjustments.map((rent, cidx) => (
                                <td key={cidx} colSpan={5} className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                    <EditableField
                                        fieldPath={[rent, 'Utilities Included']}
                                        value={(data[rent] && data[rent]['Utilities Included']) || ''}
                                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                        isEditable={true} allData={allData} />
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <SubjectRentScheduleTable data={data} onDataChange={(field, value) => handleDataChange(['SUBJECT_RENT_SCHEDULE', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} extractionAttempted={extractionAttempted} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />
        <div id="prior-sale-history-section" style={{ marginBottom: '1rem', marginTop: '1rem' }} className="card shadow mb-4">
            <div className="card-header bg-dark text-white" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Prior Sale History</strong>
                </div>
            </div>
            <div className="card-body">
                <div className="row mb-3">
                    {[
                        "Prior Sale History: I did did not research the sale or transfer history of the subject property and comparable sales",
                        "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal",
                        "Prior Sale History: Data source(s) for subject",
                        "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale",
                        "Prior Sale History: Data source(s) for comparables",
                        "Prior Sale History: Report the results of the research and analysis of the prior sale or transfer history of the subject property and comparable sales",
                        "Prior Sale History: Analysis of prior sale or transfer history of the subject property and comparable sales"
                    ].map((field, idx) => (
                        <div className="col-12 col-md-6 mb-2" key={idx}>
                            <label className="form-label font-bold" style={{ fontSize: '0.75rem', color: '#555' }}>{field}</label>
                            <EditableField
                                fieldPath={[field]}
                                value={data[field] || ''}
                                onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                isEditable={true} allData={allData} />
                        </div>
                    ))}
                </div>

                <div className="table-container" style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
                    <table className="table table-hover mb-0" style={{ fontSize: '0.8rem', minWidth: '1000px', border: '1px solid #ccc', borderCollapse: 'collapse', width: '100%' }}>
                        <thead className="table-light">
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                                <th className="border border-gray-400 p-1 font-bold" style={{ border: '1px solid #ccc', width: '250px' }}>ITEM</th>
                                <th className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc' }}>SUBJECT</th>
                                {comparableSales.map((sale, idx) => (
                                    <th key={idx} className="border border-gray-400 p-1 font-bold text-center" style={{ border: '1px solid #ccc' }}>{sale}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { label: "Date of Prior Sale/Transfer", key: "Date of Prior Sale/Transfer" },
                                { label: "Price of Prior Sale/Transfer", key: "Price of Prior Sale/Transfer" },
                                { label: "Data Source(s)", key: "Data Source(s) for prior sale" },
                                { label: "Effective Date of Data Source(s)", key: "Effective Date of Data Source(s) for prior sale" }
                            ].map((row, idx) => (
                                <tr key={idx}>
                                    <td className="border border-gray-400 p-1 font-medium" style={{ border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#fafafa' }}>{row.label}</td>

                                    <td className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                        <EditableField
                                            fieldPath={['Subject', row.key]}
                                            value={(data.Subject && data.Subject[row.key]) || ''}
                                            onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                            isEditable={true} allData={allData} />
                                    </td>

                                    {comparableSales.map((sale, sidx) => (
                                        <td key={sidx} className="border border-gray-400 p-1" style={{ border: '1px solid #ccc' }}>
                                            <EditableField
                                                fieldPath={[sale, row.key]}
                                                value={(data[sale] && data[sale][row.key]) || ''}
                                                onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                                isEditable={true} allData={allData} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <GridInfoCard id="reconciliation-section" title="RECONCILIATION" fields={reconciliationFields} data={data.RECONCILIATION} cardClass="bg-secondary" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['RECONCILIATION', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onReconciliationRevisionButtonClick} revisionHandlers={revisionHandlers} />
        <GridInfoCard id="cost-approach-section" title="Cost Approach" fields={costApproachFields} data={data} cardClass="bg-dark" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onCostApproachRevisionButtonClick} revisionHandlers={revisionHandlers} />
        <GridInfoCard id="income-approach-section" title="Income Approach" fields={incomeApproachFields} data={data} cardClass="bg-danger" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />
        <GridInfoCard id="pud-info-section" title="PUD Information" fields={pudInformationFields} data={data} cardClass="bg-secondary" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />
        <GridInfoCard id="market-conditions-summary" title="Market Conditions Narrative" fields={marketConditionsFields} data={{ ...data, ...(data?.MARKET_CONDITIONS || {}) }} cardClass="bg-warning" usePre={true} extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['MARKET_CONDITIONS', field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />
        <MarketConditionsTable id="market-conditions-section" data={data} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} marketConditionsRows={marketConditionsRows} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />
        <CondoCoopProjectsTable id="condo-coop-section" title="CONDO/CO-OP PROJECTS" data={data} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} condoCoopProjectsRows={condoCoopProjectsRows} extractionAttempted={extractionAttempted} revisionHandlers={revisionHandlers} />
        <GridInfoCard id="condo-foreclosure-section" fields={condoForeclosureFields} data={data.CONDO_FORECLOSURE} usePre={true} extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['CONDO_FORECLOSURE', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />
        <GridInfoCard id="appraiser-section" title="CERTIFICATION" fields={appraiserFields} data={data.CERTIFICATION} cardClass="bg-info" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['CERTIFICATION', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onCertificationRevisionButtonClick} revisionHandlers={revisionHandlers} />
        <PhotosGallerySection id="photos-exhibits-section" data={data} allData={allData} extractedPhotos={allData?.EXTRACTED_PHOTOS || data?.EXTRACTED_PHOTOS || []} />
    </>
);

export default Form1025;
