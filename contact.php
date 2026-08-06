<?php
/**
 * AW Webdesign — contactformulier mailer
 * -------------------------------------------------------------
 * Ontvangt de POST van het contactformulier en stuurt een mail.
 * Antwoordt met JSON zodat de site inline een bevestiging toont.
 *
 * INSTELLEN (2 regels hieronder):
 *   $RECIPIENT : waar de aanvragen toekomen.
 *   $FROM      : een adres op je EIGEN domein (awwebdesign.be).
 *                Combell mag dan namens jou verzenden (SPF/DKIM),
 *                anders belandt de mail mogelijk in spam.
 *
 * Werkt mail() onbetrouwbaar? Zet dan over op SMTP (PHPMailer met
 * je Combell-mailbox). Vraag Axel/AW om hulp.
 */

header('Content-Type: application/json; charset=utf-8');

/* ---------------- config ---------------- */
$RECIPIENT = 'info@awwebdesign.be';
$FROM      = 'no-reply@awwebdesign.be';
$FROM_NAME = 'AW Webdesign';
/* ---------------------------------------- */

function out($ok, $msg, $code = 200) {
    http_response_code($code);
    echo json_encode(['success' => $ok, 'message' => $msg]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    out(false, 'Ongeldige aanvraag.', 405);
}

// Honeypot: bots vullen het verborgen "company"-veld in.
if (!empty($_POST['company'])) {
    out(true, 'Bedankt! Je bericht is verzonden.');
}

$name    = trim($_POST['name'] ?? '');
$email   = trim($_POST['email'] ?? '');
$message = trim($_POST['message'] ?? '');
$package = trim($_POST['package'] ?? 'Niet opgegeven');
$consent = (($_POST['consent'] ?? '') === 'ja');

if ($name === '' || $message === '') {
    out(false, 'Vul je naam en bericht in.', 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    out(false, 'Vul een geldig e-mailadres in.', 422);
}
if (!$consent) {
    out(false, 'Ga akkoord met het privacybeleid om te verzenden.', 422);
}

// Voorkom header-injectie: geen nieuwe regels in kopvelden.
$strip   = function ($s) { return str_replace(["\r", "\n"], ' ', $s); };
$name    = $strip($name);
$email   = $strip($email);
$package = $strip($package);

$subject = "Projectaanvraag: {$package} ({$name})";
$body =
    "Nieuwe projectaanvraag via awwebdesign.be\n\n" .
    "Naam:    {$name}\n" .
    "E-mail:  {$email}\n" .
    "Pakket:  {$package}\n\n" .
    "Bericht:\n{$message}\n";

$headers  = "From: {$FROM_NAME} <{$FROM}>\r\n";
$headers .= "Reply-To: {$name} <{$email}>\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

if (@mail($RECIPIENT, $encodedSubject, $body, $headers)) {
    out(true, 'Bedankt! Je bericht is verzonden, ik neem snel contact op.');
}

out(false, 'Verzenden mislukt. Mail me gerust rechtstreeks via ' . $RECIPIENT . '.', 500);
