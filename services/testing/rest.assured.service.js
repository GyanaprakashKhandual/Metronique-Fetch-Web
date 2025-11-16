class RestAssuredService {
    async generateTestClass(endpoint, projectConfig, testCases) {
        console.log(`[RestAssuredService] Generating REST Assured test class | Endpoint: ${endpoint.path}`);

        try {
            const className = this.generateClassName(endpoint);
            const packageName = projectConfig.packageName || 'com.imagefetch.tests';

            const imports = this.generateImports();
            const classAnnotations = this.generateClassAnnotations(projectConfig);
            const setupMethods = this.generateSetupMethods(projectConfig);
            const testMethods = this.generateTestMethods(endpoint, testCases);
            const helperMethods = this.generateHelperMethods();

            const classContent = `package ${packageName};

${imports}

${classAnnotations}
public class ${className} {
    
    private static final String BASE_URL = "${projectConfig.baseUrl || 'http://localhost:8080'}";
    private static final String ENDPOINT = "${endpoint.path}";
    
${setupMethods}
    
${testMethods}
    
${helperMethods}
}`;

            console.log(`[RestAssuredService] Test class generated | ClassName: ${className}`);

            return {
                testClass: {
                    name: className,
                    packageName: packageName,
                    imports: imports.split('\n').filter(i => i.trim()),
                    annotations: classAnnotations.split('\n').filter(a => a.trim()),
                    content: classContent
                }
            };
        } catch (error) {
            console.error(`[RestAssuredService] Test class generation failed | Error: ${error.message}`);
            throw error;
        }
    }

    generateClassName(endpoint) {
        const method = endpoint.method.charAt(0).toUpperCase() + endpoint.method.slice(1).toLowerCase();
        const pathParts = endpoint.path.split('/').filter(p => p && !p.startsWith(':') && !p.startsWith('{'));
        const pathName = pathParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');

        return `${method}${pathName}Test`;
    }

    generateImports() {
        return `import io.restassured.RestAssured;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import org.testng.annotations.*;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;
import static org.testng.Assert.*;
import java.util.HashMap;
import java.util.Map;`;
    }

    generateClassAnnotations(projectConfig) {
        return `@Test`;
    }

    generateSetupMethods(projectConfig) {
        return `    @BeforeClass
    public void setup() {
        RestAssured.baseURI = BASE_URL;
        RestAssured.useRelaxedHTTPSValidation();
    }
    
    @BeforeMethod
    public void beforeEachTest() {
        System.out.println("Starting test execution...");
    }
    
    @AfterMethod
    public void afterEachTest() {
        System.out.println("Test execution completed");
    }`;
    }

    generateTestMethods(endpoint, testCases) {
        console.log(`[RestAssuredService] Generating test methods | TestCases: ${testCases.length}`);

        let testMethods = '';

        for (const testCase of testCases) {
            if (testCase.type === 'positive') {
                testMethods += this.generatePositiveTest(endpoint, testCase);
            } else if (testCase.type === 'negative') {
                testMethods += this.generateNegativeTest(endpoint, testCase);
            }
        }

        return testMethods;
    }

    generatePositiveTest(endpoint, testCase) {
        const methodName = `test${endpoint.method.charAt(0).toUpperCase()}${endpoint.method.slice(1).toLowerCase()}Success`;

        let requestBody = '';
        if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
            requestBody = `        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("name", "Test Name");
        requestBody.put("email", "test@example.com");
        `;
        }

        let bodySpec = '';
        if (requestBody) {
            bodySpec = `.body(requestBody)`;
        }

        return `
    @Test(priority = 1, description = "Test successful ${endpoint.method} request")
    public void ${methodName}() {
${requestBody}
        Response response = given()
            .contentType("application/json")
            .accept("application/json")${bodySpec}
            .when()
            .${endpoint.method.toLowerCase()}(ENDPOINT)
            .then()
            .statusCode(${this.getExpectedStatusCode(endpoint.method)})
            .time(lessThan(3000L))
            .extract()
            .response();
        
        System.out.println("Response: " + response.asString());
        assertNotNull(response, "Response should not be null");
    }
`;
    }

    generateNegativeTest(endpoint, testCase) {
        const methodName = `test${endpoint.method.charAt(0).toUpperCase()}${endpoint.method.slice(1).toLowerCase()}InvalidData`;

        let requestBody = '';
        if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
            requestBody = `        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("invalid", "data");
        `;
        }

        let bodySpec = '';
        if (requestBody) {
            bodySpec = `.body(requestBody)`;
        }

        return `
    @Test(priority = 2, description = "Test ${endpoint.method} request with invalid data")
    public void ${methodName}() {
${requestBody}
        given()
            .contentType("application/json")
            .accept("application/json")${bodySpec}
            .when()
            .${endpoint.method.toLowerCase()}(ENDPOINT)
            .then()
            .statusCode(anyOf(is(400), is(422)))
            .time(lessThan(3000L));
    }
`;
    }

    getExpectedStatusCode(method) {
        const statusCodes = {
            'GET': 200,
            'POST': 201,
            'PUT': 200,
            'PATCH': 200,
            'DELETE': 204
        };
        return statusCodes[method] || 200;
    }

    generateHelperMethods() {
        return `
    private String getAuthToken() {
        return "test-token-123";
    }
    
    private Map<String, String> getCommonHeaders() {
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");
        headers.put("Accept", "application/json");
        return headers;
    }`;
    }

    async generateTestSuite(testSuite, projectConfig) {
        console.log(`[RestAssuredService] Generating test suite | Suite: ${testSuite.name}`);

        try {
            const suiteClassName = `${testSuite.name.replace(/\s+/g, '')}Suite`;
            const packageName = projectConfig.packageName || 'com.imagefetch.tests';

            const content = `package ${packageName};

import org.testng.annotations.BeforeSuite;
import org.testng.annotations.AfterSuite;

public class ${suiteClassName} {
    
    @BeforeSuite
    public void setupSuite() {
        System.out.println("Starting test suite: ${testSuite.name}");
    }
    
    @AfterSuite
    public void tearDownSuite() {
        System.out.println("Test suite completed: ${testSuite.name}");
    }
}`;

            console.log(`[RestAssuredService] Test suite generated | ClassName: ${suiteClassName}`);
            return { content, className: suiteClassName };
        } catch (error) {
            console.error(`[RestAssuredService] Test suite generation failed | Error: ${error.message}`);
            throw error;
        }
    }

    generateRequestBuilder(endpoint, testData) {
        console.log(`[RestAssuredService] Generating request builder | Method: ${endpoint.method}`);

        let builder = `given()
            .contentType("application/json")
            .accept("application/json")`;

        if (testData?.headers) {
            builder += `\n            .headers(${JSON.stringify(testData.headers)})`;
        }

        if (testData?.queryParams) {
            builder += `\n            .queryParams(${JSON.stringify(testData.queryParams)})`;
        }

        if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && testData?.body) {
            builder += `\n            .body(${JSON.stringify(testData.body)})`;
        }

        return builder;
    }

    generateAssertions(expectedResponse) {
        console.log(`[RestAssuredService] Generating assertions`);

        let assertions = `.statusCode(${expectedResponse.statusCode})`;

        if (expectedResponse.responseTime) {
            assertions += `\n            .time(lessThan(${expectedResponse.responseTime}L))`;
        }

        if (expectedResponse.body) {
            Object.keys(expectedResponse.body).forEach(key => {
                assertions += `\n            .body("${key}", notNullValue())`;
            });
        }

        return assertions;
    }
}

module.exports = new RestAssuredService();