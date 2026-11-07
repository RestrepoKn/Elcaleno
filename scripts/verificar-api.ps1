# Verificación en vivo de la API del inventario (P05), con un administrador y un encargado.
# Requiere el servidor en marcha (npx next dev -p 3100) y los usuarios de npm run db:demo.
# Uso: powershell -ExecutionPolicy Bypass -File scripts\verificar-api.ps1 -ClaveAdmin <clave> -ClaveEncargado <clave>
# Crea datos "Prueba API …"; al terminar: npm run db:limpiar -- --solo-prueba
param([string]$Base = "http://localhost:3100", [string]$ClaveAdmin, [string]$ClaveEncargado)
$ErrorActionPreference = "Stop"
$api = "$Base/api/inventario"
$script:fallas = 0; $script:total = 0

function Llamar($sesion, $metodo, $ruta, $cuerpo = $null, [switch]$Crudo) {
  $args = @{ Uri = "$api$ruta"; Method = $metodo; UseBasicParsing = $true; TimeoutSec = 90 }
  if ($sesion) { $args.WebSession = $sesion }
  if ($null -ne $cuerpo) { $args.ContentType = "application/json"; $args.Body = if ($Crudo) { $cuerpo } else { $cuerpo | ConvertTo-Json -Compress } }
  try { $r = Invoke-WebRequest @args; return @{ estado = [int]$r.StatusCode; json = ($r.Content | ConvertFrom-Json) } }
  catch { $resp = $_.Exception.Response; if (-not $resp) { throw }; $sr = New-Object IO.StreamReader($resp.GetResponseStream()); return @{ estado = [int]$resp.StatusCode; json = ($sr.ReadToEnd() | ConvertFrom-Json) } }
}

function Esperar($id, $texto, $r, $estado, $codigo = $null) {
  $script:total++
  $real = if ($r.json.ok -eq $false) { $r.json.error.codigo } else { "" }
  $ok = ($r.estado -eq $estado) -and (($null -eq $codigo) -or ($real -eq $codigo))
  if ($ok) { "OK     $($id.PadRight(4)) $texto â†’ $($r.estado)$(if ($codigo) { " $codigo" })" }
  else { $script:fallas++; "FALLA  $($id.PadRight(4)) $texto â†’ esperado $estado $codigo, llegÃ³ $($r.estado) $real" }
}

function Sesion($email, $clave) {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $b = @{ email = $email; password = $clave } | ConvertTo-Json -Compress
  $r = Invoke-WebRequest "$Base/api/auth/login" -Method POST -Body $b -ContentType "application/json" -WebSession $s -UseBasicParsing -TimeoutSec 90
  if ($r.StatusCode -ne 200) { throw "No se pudo iniciar sesiÃ³n con $email" }
  return $s
}

"--- Sin sesiÃ³n"
Esperar "1" "GET productos" (Llamar $null GET "/productos") 401 "NO_AUTORIZADO"
Esperar "2" "GET inventario" (Llamar $null GET "/inventario") 401 "NO_AUTORIZADO"
Esperar "3" "POST turnos" (Llamar $null POST "/turnos" @{ nombre = "x"; encargado = "y" }) 401 "NO_AUTORIZADO"
Esperar "4" "POST cerrar" (Llamar $null POST "/turnos/00000000-0000-0000-0000-000000000000/cerrar") 401 "NO_AUTORIZADO"

$adm = Sesion "admin@demo.elcaleno.test" $ClaveAdmin
$enc = Sesion "encargado@demo.elcaleno.test" $ClaveEncargado

"--- Productos"
$r = Llamar $adm POST "/productos" @{ nombre = "Prueba API Gaseosa"; seccion = "bar"; categoria = "Bebida"; valorUnitario = 3500 }
Esperar "5" "Administrador crea producto de bar" $r 201; $gaseosa = $r.json.datos.id
$r = Llamar $adm POST "/productos" @{ nombre = "Prueba API Helado"; seccion = "helados"; categoria = "Helado"; valorUnitario = 4000 }
Esperar "6" "Administrador crea producto de helados" $r 201; $helado = $r.json.datos.id
Esperar "7" "Duplicado en la misma secciÃ³n" (Llamar $adm POST "/productos" @{ nombre = "prueba api gaseosa"; seccion = "bar"; categoria = "Bebida"; valorUnitario = 3500 }) 409 "PRODUCTO_DUPLICADO"
Esperar "8" "Encargado intenta crear producto" (Llamar $enc POST "/productos" @{ nombre = "Prueba API X"; seccion = "bar"; categoria = "Otro"; valorUnitario = 1000 }) 403 "SIN_PERMISO"
Esperar "9" "Encargado intenta cambiar un valor" (Llamar $enc PATCH "/productos/$gaseosa" @{ valorUnitario = 1 }) 403 "SIN_PERMISO"
Esperar "10" "Cambiar la secciÃ³n (no permitido)" (Llamar $adm PATCH "/productos/$gaseosa" @{ seccion = "helados" }) 400 "DATOS_INVALIDOS"
Esperar "11" "JSON invÃ¡lido" (Llamar $adm POST "/productos" "{nombre:" -Crudo) 400 "DATOS_INVALIDOS"
$r = Llamar $enc GET "/productos?seccion=helados&soloActivos=true"
Esperar "12" "Encargado lista productos de helados" $r 200

"--- Turno"
$r = Llamar $enc POST "/turnos" @{ nombre = "Prueba API"; encargado = "Encargado demo" }
Esperar "13" "Encargado abre el turno" $r 201; $turno = $r.json.datos
$filaG = $turno.registros | Where-Object { $_.productoId -eq $gaseosa }
$filaH = $turno.registros | Where-Object { $_.productoId -eq $helado }
Esperar "14" "Abrir otro turno" (Llamar $enc POST "/turnos" @{ nombre = "Prueba API 2"; encargado = "x" }) 409 "TURNO_YA_ABIERTO"
Esperar "15" "Encargado intenta ajustar el inicial" (Llamar $enc PATCH "/turnos/$($turno.id)/registros/$($filaG.id)" @{ inicial = 24 }) 403 "SIN_PERMISO"
$r = Llamar $adm PATCH "/turnos/$($turno.id)/registros/$($filaG.id)" @{ inicial = 24 }
Esperar "16" "Administrador ajusta el inicial a 24" $r 200
$r = Llamar $enc PATCH "/turnos/$($turno.id)/registros/$($filaG.id)" @{ entrada = 12; vendida = 18 }
Esperar "17" "Encargado registra entrada 12 y vendida 18" $r 200
"             final calculado $($r.json.datos.finalCalculado), total venta $($r.json.datos.totalVenta)"
Esperar "18" "Vendida 40 (supera inicial + entrada)" (Llamar $enc PATCH "/turnos/$($turno.id)/registros/$($filaG.id)" @{ vendida = 40 }) 409 "VENDIDO_EXCEDE_EXISTENCIA"
Esperar "19" "Cantidad negativa" (Llamar $enc PATCH "/turnos/$($turno.id)/registros/$($filaG.id)" @{ entrada = -1 }) 400 "DATOS_INVALIDOS"
$r = Llamar $enc PATCH "/turnos/$($turno.id)/registros/$($filaG.id)" @{ contado = 16 }
Esperar "20" "Encargado registra conteo 16 (faltante)" $r 200
"             faltante $($r.json.datos.faltante), valor a cancelar $($r.json.datos.valorACancelar), conteo $($r.json.datos.estadoConteo)"
Esperar "21" "Entregar con filas sin conteo" (Llamar $enc POST "/turnos/$($turno.id)/entregar") 409 "TURNO_INCOMPLETO"
foreach ($f in (Llamar $enc GET "/turnos/$($turno.id)").json.datos.registros) {
  if ($null -eq $f.contado) { [void](Llamar $enc PATCH "/turnos/$($turno.id)/registros/$($f.id)" @{ contado = $f.finalCalculado }) }
}
$r = Llamar $enc GET "/turnos/$($turno.id)"
Esperar "22" "Encargado ve su turno sin finanzas" $r 200
"             facturas: '$($r.json.datos.facturasEfectivo)', resultado neto: '$($r.json.datos.resultadoNeto)', filas sin conteo: $($r.json.datos.sinConteo)"
$r = Llamar $enc POST "/turnos/$($turno.id)/entregar"
Esperar "23" "Encargado entrega el turno" $r 200; "             estado: $($r.json.datos.estado)"
Esperar "24" "Encargado edita el turno entregado" (Llamar $enc PATCH "/turnos/$($turno.id)/registros/$($filaH.id)" @{ entrada = 1 }) 409 "TURNO_NO_EDITABLE"
Esperar "25" "Encargado intenta registrar finanzas" (Llamar $enc PUT "/turnos/$($turno.id)/finanzas" @{ facturasEfectivo = 0; pagoEncargado = 999999 }) 403 "SIN_PERMISO"
Esperar "26" "Encargado intenta cerrar" (Llamar $enc POST "/turnos/$($turno.id)/cerrar") 403 "SIN_PERMISO"
Esperar "27" "Encargado intenta devolver" (Llamar $enc POST "/turnos/$($turno.id)/devolver") 403 "SIN_PERMISO"
Esperar "28" "Administrador cierra sin finanzas" (Llamar $adm POST "/turnos/$($turno.id)/cerrar") 409 "TURNO_INCOMPLETO"
$r = Llamar $adm PUT "/turnos/$($turno.id)/finanzas" @{ facturasEfectivo = 10000; pagoEncargado = 20000 }
Esperar "29" "Administrador registra facturas y pago" $r 200
"             venta total $($r.json.datos.ventaTotal), resultado neto $($r.json.datos.resultadoNeto)"
$r = Llamar $adm POST "/turnos/$($turno.id)/cerrar"
Esperar "30" "Administrador cierra el turno" $r 200; "             estado: $($r.json.datos.estado), neto guardado $($r.json.datos.resultadoNetoCierre)"
Esperar "31" "Devolver un turno cerrado" (Llamar $adm POST "/turnos/$($turno.id)/devolver") 409 "TRANSICION_INVALIDA"

"--- Lecturas"
Esperar "32" "Administrador ve el historial" (Llamar $adm GET "/turnos?limite=5") 200
Esperar "33" "Encargado intenta ver el historial" (Llamar $enc GET "/turnos") 403 "SIN_PERMISO"
$r = Llamar $enc GET "/inventario?soloPorReponer=true"
Esperar "34" "Inventario por reponer" $r 200; "             productos con alerta: $(@($r.json.datos).Count)"
Esperar "35" "Turno inexistente" (Llamar $adm GET "/turnos/00000000-0000-4000-8000-000000000000") 404 "TURNO_NO_ENCONTRADO"
Esperar "36" "Id de turno con formato invÃ¡lido" (Llamar $adm GET "/turnos/abc") 404 "TURNO_NO_ENCONTRADO"
$r = Llamar $adm PATCH "/productos/$gaseosa" @{ valorUnitario = 3800 }
Esperar "37" "Administrador cambia el valor" $r 200

""; "$($script:total - $script:fallas) de $($script:total) OK; fallas: $($script:fallas)"
