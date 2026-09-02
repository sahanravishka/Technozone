<form action="" method="POST">
    <label for="order_id">Order ID:</label>
    <input type="text" id="order_id" name="order_id" required><br>

    <label for="amount">Amount:</label>
    <input type="text" id="amount" name="amount" required><br>

    <input type="submit" value="Proceed to Payment">
</form>
<?php

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Collecting order_id and amount from the form
    $order_id = $_POST['order_id'];
    $amount = $_POST['amount'];

    // Constants
    $merchant = 'c8cca514bdfa0582cdc40c9703c71e9d';
    $currency = 'LKR';
    $pluginName = "customapi";
    $pluginVersion = 1;
    $reference = 1234;
    $firstName = 'Joe';
    $lastName = 'Kate';
    $email = 'webivox@gmail.com';
    $mobile = '0777904054';
    $apiKey = '83fA5n1xUaj8OKnX23YY5vlni5q39gBi';
    $redirect_url = 'http://localhost/return';
    $cancel_url = 'http://localhost/cancel';
    $response_url = 'https://webhook.site/3ff12552-6fef-4379-a4ba-b7a12d1c71d3';
    $productName = "1 Product";

    // Signature generation
    $dataString = $merchant . $amount . $currency . $pluginName . $pluginVersion . $redirect_url . $cancel_url . $order_id .
        $reference . $firstName . $lastName . $email . $productName . $apiKey . $response_url;

    $pkeyid = openssl_get_privatekey(file_get_contents("private_key.pem"));

    if ($pkeyid === false) {
        die(openssl_error_string());
    }

    if (!openssl_sign($dataString, $signature, $pkeyid, OPENSSL_ALGO_SHA256)) {
        $signatureEncoded = openssl_error_string();
    } else {
        $signatureEncoded = base64_encode($signature);
    }

    // Prepare form data to send to Koko
    $darazbnpl_args = array(
        '_mId' => $merchant,
        'api_key' => $apiKey,
        '_returnUrl' => $redirect_url,
        '_responseUrl' => $response_url,
        '_currency' => $currency,
        '_amount' => $amount,
        '_reference' => $reference,
        '_pluginName' => $pluginName,
        '_pluginVersion' => $pluginVersion,
        '_cancelUrl' => $cancel_url,
        '_orderId' => $order_id,
        '_firstName' => $firstName,
        '_lastName' => $lastName,
        '_email' => $email,
        '_description' => $productName,
        'dataString' => $dataString,
        'signature' => $signatureEncoded,
        '_mobileNo' => $mobile
    );

    // Payment gateway URL
    $url = 'https://qaapi.paykoko.com/api/merchants/orderCreate';

    // Automatically generate a form and submit it via JavaScript (only one button press)
    echo '
    <form action="' . $url . '" method="post" id="darazbnpl_payment_form">
        ' . implode('', array_map(function($key, $value) {
            return "<input type='hidden' name='$key' value='$value'/>";
        }, array_keys($darazbnpl_args), $darazbnpl_args)) . '
    </form>

    <script type="text/javascript">
        document.getElementById("darazbnpl_payment_form").submit();
    </script>
    ';
}
?>
