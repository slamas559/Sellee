function formatPhone(phone){
    const digits = String(phone).replace(/\D/g, "");
    const affix = digits.slice(0, 7);
    const suffix = digits.slice(-4);
    return suffix ? `${affix}***${suffix}` : "WhatsApp Customer";
}

console.log(formatPhone("08100596007")); // Output: "3456***7890"