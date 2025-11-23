export interface ApiResponse<T> {
    message: String;
    error: Boolean;
    results: T;
    code: Number;
}