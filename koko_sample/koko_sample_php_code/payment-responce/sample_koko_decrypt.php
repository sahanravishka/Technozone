<?php


function proceedKoko(){
        $orderId = 'ONL24052603430';
        $trnId = '825e85224f13ba6c652cc2d5c0f599b9';
        $status= 'SUCCESS';
        $desc = '';

        $dataString = $orderId . $trnId . $status . $desc;

        $signature = 'guYQuVV92QtJO8V11ekmyo6px5VaGefxiiIThmoq8XbH8/+wnsT7mkgYUWsvg5oVrpSZyw0c8Odu41+rT59Cm0KCajFJ7kcICrdWNodZgd9PNCO2KjxO83NKZHo71hVb9mnScL/df5j7Y6e2Flezd5f8pMD+LZEtQt7+8lz7xoE=';

       $pubKeyid = openssl_get_publickey($this->public_key);
       $signatureVerify = openssl_verify($dataString, base64_decode($signature), $pubKeyid, OPENSSL_ALGO_SHA256);
       error_log($signatureVerify);

       if ($signatureVerify == 1) {
           $trans_authorised = true;
       } elseif ($signatureVerify == 0) {
           $trans_authorised = false;
       } else {
           $trans_authorised = false;
       }
       openssl_free_key($pubKeyid);
    }

    proceedKoko();

?>