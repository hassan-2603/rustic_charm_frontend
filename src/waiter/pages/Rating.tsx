const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://rustic-charm-backend.onrender.com").replace(/\/$/, "");

export default function Rating() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">
            <h1 className="text-4xl font-bold">Rating QR Code</h1>
            <p className="text-gray-500 mb-8">
                Show this QR code to customers to collect feedback
            </p>

            <div className="flex justify-center items-center mt-10">
                <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-10 w-full max-w-sm sm:max-w-md text-center border border-gray-200/50 flex flex-col items-center">
                    <h2 className="text-2xl font-bold mb-3 text-gray-800">Scan to Rate Us</h2>
                    <p className="text-gray-500 mb-8 text-sm sm:text-base px-2">
                        Scan this QR code with your phone to share your experience.
                    </p>

                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-inner flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72">
                        <img
                            src={`${API_BASE_URL}/api/rating-qr.png`}
                            alt="Rating QR Code"
                            className="w-full h-full object-contain mix-blend-multiply"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
