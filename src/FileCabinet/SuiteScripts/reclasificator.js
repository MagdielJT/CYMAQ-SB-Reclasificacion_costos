function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
    var check = transactionRecord.getFieldValue('custbody_tko_reclasification');

    try {
        if (check == 'T' || check == true) {
            //?Obtencion del tipo de transaccion
            var tipotran = transactionRecord.getRecordType() || '';
            nlapiLogExecution('DEBUG', 'Tipo de transaccion', tipotran);
            nlapiLogExecution('DEBUG', 'Confirmación', 'Sí está marcado el check');

            var CostosPromedio = [];
            var cantidadPorItem = [];
            var nombres = [];
            var odv = transactionRecord.getFieldValue('createdfrom');
            nlapiLogExecution('DEBUG', 'Obtencion de id de la odv', odv + ' tipo: ' + typeof (odv));

            if (tipotran == "invoice") {
                var itemFullData = getItemFullData(odv);

                nlapiLogExecution('DEBUG', 'DATA', JSON.stringify(itemFullData))
                if (itemFullData.length > 0) {

                    nlapiLogExecution('DEBUG', 'Validacion', 'SI existe un itemfullfilment, su id es: ' + itemFullData[0].id + ', '+' su folio es: '+itemFullData[0].folio+', por lo tanto el script no se ejecutó')
                } else{
                    nlapiLogExecution('DEBUG', 'Validacion', 'NO existe un itemfullfilment, entonces deberia trabajar el script')
                    for (var i = 1; i < transactionRecord.getLineItemCount('item') + 1; i++) {//!manejo de la sublista item
                        var item = transactionRecord.getLineItemValue('item', 'item', i); //!Obtencion de ids
                        CostosPromedio.push(item); //!IDs de los articulos
                        // nlapiLogExecution('DEBUG', 'IDs', CostosPromedio)

                        var cantidad = transactionRecord.getLineItemValue('item', 'quantity', i);//!Obtencion de cantidades
                        cantidadPorItem.push(cantidad);
                        // nlapiLogExecution('DEBUG', 'arreglo de cantidades', 'cantidad del articulo '+i+' :'+cantidad);
                        // nlapiLogExecution('DEBUG', 'array completo de cantidades', cantidad);

                        var names = transactionRecord.getLineItemValue('item', 'item_display', i);//!Obtencion de nombres
                        nombres.push(names);

                    }

                    if (CostosPromedio.length == cantidadPorItem.length) {
                        nlapiLogExecution('DEBUG', 'Validacion', 'Si tienen el mismo tamaño');
                        var itemData = getItemData(CostosPromedio); //! Aqui esta el arreglo results
                        for (var y = 0; y < CostosPromedio.length; y++) {
                            for (var x = 0; x < itemData.length; x++) { //?Se recorren el arreglo de objetos armado en la busqueda guardada
                                if (itemData[x].averagecost != "NA" && itemData[x].cta_cargo != "NA" && itemData[x].cta_abono != "NA") {//?Se valida que la posicion en la que va el arreglo contenga toda la informacion correcta
                                    if (itemData[x].id == CostosPromedio[y]) {
                                        //?Se comparan los articulos de la transaccion, contra los que se tienen de la busqueda,
                                        //?esto para que los datos de costo promedio concuerden con la cantidad del mismo articulo
                                        //?Impresion de nombres para el mapeo de articulos
                                        //*Se realiza la multiplicacion entre el costo promedio del articulo, por la cantidad dada en la transaccion
                                        var multiplicacion = itemData[x].averagecost * cantidadPorItem[y];
                                        nlapiLogExecution('DEBUG', 'Resultado de la multiplicacion', CostosPromedio[y] + ' : ' + itemData[x].name + ' : ' + itemData[x].averagecost + ' x ' + cantidadPorItem[y] + ' = ' + multiplicacion);

                                        //?Se comienza el mapeo de las diferentes cuentas contables por cada articulo
                                        var cta_venta = itemData[x].cta_cargo; //!cuenta para los cargos (costos)
                                        nlapiLogExecution('DEBUG', 'Cuenta de cargo', itemData[x].name + ' : ' + 'TIPO: ' + typeof (itemData[x].cta_cargo) + ' ' + itemData[x].cta_cargo);
                                        var cta_inve = itemData[x].cta_abono; //!cuenta para los abonos (inventario)
                                        nlapiLogExecution('DEBUG', 'Cuenta de abono', itemData[x].name + ' : ' + 'TIPO: ' + typeof (itemData[x].cta_abono) + ' ' + itemData[x].cta_abono);

                                        //?En caso de que los items no tengan cuenta, simplemente no realiza el proceso
                                        if (cta_venta != "NA" && cta_inve != "NA") {
                                            //?Si contienen cuentas, pero son las mismas, no opera
                                            if (cta_venta != cta_inve) {
                                                nlapiLogExecution('DEBUG', 'Inserta linea en LM', 'Debio de poner la linea');
                                                //?Creacion de las lineas de cargos (costo)
                                                var newLine = customLines.addNewLine();
                                                newLine.setAccountId(parseInt(cta_venta));
                                                newLine.setDebitAmount(multiplicacion);
                                                newLine.setMemo('Prueba de reclasificación (cargos) item: ' + itemData[x].name);

                                                //?Creacion de las lienas de abonos (inventario)
                                                var newLine = customLines.addNewLine();
                                                newLine.setAccountId(parseInt(cta_inve));
                                                newLine.setCreditAmount(multiplicacion);
                                                newLine.setMemo('Prueba de reclasificación (abonos) item: ' + itemData[x].name);
                                            } else {
                                                nlapiLogExecution('DEBUG', 'NO inserta linea en LM', 'NO debio de poner la linea, validar que las cuentas en el articulo NO sean las mismas');
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (tipotran == "itemfulfillment") {
                var invData = getInvData(odv);

                nlapiLogExecution('DEBUG', 'DATA', JSON.stringify(invData))
                if (invData.length > 0) {
                    if (invData[0].invoice != "") {
                        nlapiLogExecution('DEBUG', 'Validacion', 'SI existe una factura, el id es: ' + invData[0].invoice+  ', '+' su folio es: '+invData[0].folio)
                        for (var i = 1; i < transactionRecord.getLineItemCount('item') + 1; i++) {//!manejo de la sublista item
                            var item = transactionRecord.getLineItemValue('item', 'item', i); //!Obtencion de ids
                            CostosPromedio.push(item); //!IDs de los articulos
                            // nlapiLogExecution('DEBUG', 'IDs', CostosPromedio)

                            var cantidad = transactionRecord.getLineItemValue('item', 'quantity', i);//!Obtencion de cantidades
                            cantidadPorItem.push(cantidad);
                            // nlapiLogExecution('DEBUG', 'arreglo de cantidades', 'cantidad del articulo '+i+' :'+cantidad);
                            // nlapiLogExecution('DEBUG', 'array completo de cantidades', cantidad);

                            var names = transactionRecord.getLineItemValue('item', 'item_display', i);//!Obtencion de nombres
                            nombres.push(names);

                        }

                        if (CostosPromedio.length == cantidadPorItem.length) {
                            nlapiLogExecution('DEBUG', 'Validacion', 'Si tienen el mismo tamaño');
                            var itemData = getItemData(CostosPromedio); //! Aqui esta el arreglo results
                            for (var y = 0; y < CostosPromedio.length; y++) {
                                for (var x = 0; x < itemData.length; x++) { //?Se recorren el arreglo de objetos armado en la busqueda guardada
                                    if (itemData[x].averagecost != "NA" && itemData[x].cta_cargo != "NA" && itemData[x].cta_abono != "NA") {//?Se valida que la posicion en la que va el arreglo contenga toda la informacion correcta
                                        if (itemData[x].id == CostosPromedio[y]) {
                                            //?Se comparan los articulos de la transaccion, contra los que se tienen de la busqueda,
                                            //?esto para que los datos de costo promedio concuerden con la cantidad del mismo articulo
                                            //?Impresion de nombres para el mapeo de articulos
                                            //*Se realiza la multiplicacion entre el costo promedio del articulo, por la cantidad dada en la transaccion
                                            var multiplicacion = itemData[x].averagecost * cantidadPorItem[y];
                                            nlapiLogExecution('DEBUG', 'Resultado de la multiplicacion', CostosPromedio[y] + ' : ' + itemData[x].name + ' : ' + itemData[x].averagecost + ' x ' + cantidadPorItem[y] + ' = ' + multiplicacion);

                                            //?Se comienza el mapeo de las diferentes cuentas contables por cada articulo
                                            var cta_venta = itemData[x].cta_cargo; //!cuenta para los cargos (costos)
                                            nlapiLogExecution('DEBUG', 'Cuenta de cargo', itemData[x].name + ' : ' + 'TIPO: ' + typeof (itemData[x].cta_cargo) + ' ' + itemData[x].cta_cargo);
                                            var cta_inve = itemData[x].cta_abono; //!cuenta para los abonos (inventario)
                                            nlapiLogExecution('DEBUG', 'Cuenta de abono', itemData[x].name + ' : ' + 'TIPO: ' + typeof (itemData[x].cta_abono) + ' ' + itemData[x].cta_abono);

                                            //?En caso de que los items no tengan cuenta, simplemente no realiza el proceso
                                            if (cta_venta != "NA" && cta_inve != "NA") {
                                                //?Si contienen cuentas, pero son las mismas, no opera
                                                if (cta_venta != cta_inve) {
                                                    nlapiLogExecution('DEBUG', 'Inserta linea en LM', 'Debio de poner la linea');
                                                    //?Creacion de las lineas de cargos (costo)
                                                    var newLine = customLines.addNewLine();
                                                    newLine.setAccountId(parseInt(cta_inve));
                                                    newLine.setDebitAmount(multiplicacion);
                                                    newLine.setMemo('Prueba de reclasificación (abonos) item: ' + itemData[x].name);

                                                    //?Creacion de las lienas de abonos (inventario)
                                                    var newLine = customLines.addNewLine();
                                                    newLine.setAccountId(parseInt(cta_venta));
                                                    newLine.setCreditAmount(multiplicacion);
                                                    newLine.setMemo('Prueba de reclasificación (cargos) item: ' + itemData[x].name);
                                                } else {
                                                    nlapiLogExecution('DEBUG', 'NO inserta linea en LM', 'NO debio de poner la linea, validar que las cuentas en el articulo NO sean las mismas');
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        nlapiLogExecution('DEBUG', 'Validacion', 'La información en el objeto no está bien')
                    }
                } else{
                    nlapiLogExecution('ERROR', 'Error', 'NO existe una factura, entonces no deberia trabajar el script')
                }
            }
        }
    } catch (error) {
        nlapiLogExecution('ERROR', 'Nojala', error);

    }
    function getItemData(CostosPromedio) {//?Busqueda guardada que trae el id interno y el costo promedio de cada item de la transaccion
        var results = []
        try {
            //?Creacion de una busqueda guardada para articulos
            var itemSearch = nlapiCreateSearch("item",
                [
                    ["internalid", "anyof", CostosPromedio]
                ],
                [
                    //?Datos de los articulos a buscar
                    new nlobjSearchColumn("internalid"),
                    new nlobjSearchColumn("averagecost"),
                    new nlobjSearchColumn("itemid"),
                    new nlobjSearchColumn("custitem_tko_costo_venta_recla"),
                    new nlobjSearchColumn("custitem_tko_inventario_recla")
                ]
            );
            //?Ejecucion de la busqueda
            var costoPromedio = itemSearch.runSearch().getResults(0, (CostosPromedio.length));
            for (var i = 0; i < costoPromedio.length; i++) {//?Recorrido de los resultados
                results.push({//?Se almacenan los resultados en el arreglo llamado "results"
                    id: costoPromedio[i].getValue('internalid'),
                    //!Se busca el costo promedio de cada articulo y en caso no contener nada,
                    //!se coloca una "m", esto con el fin de poder discriminar entre los diferentes tipos de articulos
                    averagecost: costoPromedio[i].getValue('averagecost') || 'NA',
                    name: costoPromedio[i].getValue('itemid'),
                    cta_cargo: costoPromedio[i].getValue('custitem_tko_costo_venta_recla') || 'NA',
                    cta_abono: costoPromedio[i].getValue('custitem_tko_inventario_recla') || 'NA'
                });
            }
            nlapiLogExecution('DEBUG', 'Arreglo de resultados de busqueda itemSearch', JSON.stringify(results));
        } catch (errorGetItem) {
            nlapiLogExecution('ERROR', 'No salio la busqueda itemSearch', errorGetItem);
        } return results;
    }

    function getItemFullData(odvID) {//?Busqueda guardada que trae info de la odv de venta de origen
        var itemFullData = []
        try {
            var itemfulfillmentSearch = nlapiSearchRecord("itemfulfillment", null,
                [
                    ["type", "anyof", "ItemShip"],
                    "AND",
                    ["createdfrom", "anyof", odvID]
                ],
                [
                    new nlobjSearchColumn("internalid"),
                    new nlobjSearchColumn("custbody_mx_cfdi_folio"),
                    new nlobjSearchColumn("item"),
                    new nlobjSearchColumn("appliedtotransaction")
                ]
            );
            //?Ejecucion de la busqueda
            for (var itemfull = 0; itemfull < itemfulfillmentSearch.length; itemfull++) {
                if (itemfulfillmentSearch[itemfull].getValue('appliedtotransaction') != '') {
                    itemFullData.push({//?Se almacenan los resultados en el arreglo llamado "itemFullData"
                        id: itemfulfillmentSearch[itemfull].getValue('internalid') || 'NA', //!id del itemfullfilment
                        item: itemfulfillmentSearch[itemfull].getValue('item'), //!item o items que hay
                        folio: itemfulfillmentSearch[itemfull].getValue('custbody_mx_cfdi_folio') || 'NA', //!folio
                        fromODV: itemfulfillmentSearch[itemfull].getValue('appliedtotransaction') //!id de la odv origen
                    });
                }
            }
            nlapiLogExecution('DEBUG', 'Arreglo de resultados de busqueda itemfulfillmentSearch', JSON.stringify(itemFullData));
        } catch (errorGetItemFullData) {
            nlapiLogExecution('ERROR', 'No salio la busqueda itemfulfillmentSearch', errorGetItemFullData + ', esto debido a que no existe un itemfullfilment creado desde el sig id: ' + odvID);
        } return itemFullData;
    }

    function getInvData(odvID) {//?Busqueda guardada que trae una factura que contenga el id de la odv en el creado desde
        var invData = []
        try {
            var invoiceSearch = nlapiSearchRecord("invoice", null,
                [
                    ["type", "anyof", "CustInvc"],
                    "AND",
                    ["createdfrom", "anyof", odvID]
                ],
                [
                    new nlobjSearchColumn("internalid"),
                    new nlobjSearchColumn("createdfrom"),
                    new nlobjSearchColumn("custbody_mx_cfdi_folio"),
                    new nlobjSearchColumn("item")
                ]
            );

            for (var inv = 0; inv < invoiceSearch.length; inv++) {
                if (invoiceSearch[inv].getValue('item') != '') {
                    invData.push({
                        invoice: invoiceSearch[inv].getValue('internalid') || 'NA',
                        odv: invoiceSearch[inv].getValue('createdfrom') || 'NA',
                        item: invoiceSearch[inv].getValue('item') || 'NA',
                        folio: invoiceSearch[inv].getValue('custbody_mx_cfdi_folio') || 'NA', //!folio
                    });
                }
            }
            nlapiLogExecution('DEBUG', 'Arreglo de resultados de busqueda invoiceSearch', JSON.stringify(invData));
        } catch (getInvDataError) {
            nlapiLogExecution('DEBUG', 'No salió la busqueda invoiceSearch', getInvDataError + ', esto debido a que no existe una factura creada desde el sig id: ' + odvID)
        }
        return invData;

    }

}