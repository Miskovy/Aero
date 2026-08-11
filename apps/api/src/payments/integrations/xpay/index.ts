// import { loadXPay } from "@xpayeg/sdk";

// // Module-level: call once, share across the app.
// const xpayPromise = loadXPay("pk_test_...");

// async function startCheckout() {
//     const xpay = await xpayPromise;
//     if (!xpay) return; // SSR returns null on the server

//     // initCheckout accepts a Promise<string> too, so you can pass the fetch directly.
//     const checkout = await xpay.initCheckout({
//         clientSecret: fetch("/api/create-checkout", { method: "POST" })
//             .then((r) => r.json())
//             .then((d) => d.clientSecret as string),
//     });

//     // Mount the payment element.
//     const elements = checkout.getElements();
//     const paymentElement = elements.create("payment");
//     paymentElement.mount("#payment-element");

//     // Listen for state changes (promo codes, quantity updates, fee recalcs).
//     checkout.on("change", (session) => {
//         document.getElementById("total")!.textContent =
//             `${session.currency} ${(session.amountTotal / 100).toFixed(2)}`;
//     });

//     // Confirm when the customer submits.
//     document.getElementById("pay")!.addEventListener("click", async () => {
//         const result = await checkout.confirm({
//             customerDetails: { email: "customer@example.com", name: "Aya Hassan" },
//         });
//         if (result.type === "error") {
//             console.error(result.error.message);
//             return;
//         }
//         window.location.href = "/thank-you";
//     });
// }